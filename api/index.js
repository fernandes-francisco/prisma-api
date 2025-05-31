// api/index.js

// 1) Hard‐coded configuration (replace placeholders with your real values):
const DATABASE_URL      = 'postgresql://postgres.gbxmofoqcszpizdqqxly:postgres123!@aws-0-eu-west-3.pooler.supabase.com:5432/postgres';
const SPOONACULAR_KEY   = '9a0a6ef2971d4c29b04b6b5415a50366';
const UNSPLASH_KEY      = 'rWCUPHPcjJJ84mDg_VfiiuyAGWcNKYsQk6iczg0wwiA';
const ALLOWED_ORIGIN    = 'http://localhost:8100';
const PORT              = 3000;

// 2) Imports & Prisma initialization
require('dotenv').config(); // (optional—only if you want to mix in env later)
const http           = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma         = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

// 3) Utility: Send JSON response with CORS headers
function sendJSON(res, statusCode, data) {
  const payload = data === null ? '' : JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(payload);
}

// 4) Helper: “Fetch or Cache” an image URL by food name
async function getOrFetchImage(name) {
  // 4a) Try to find in Prisma’s Image table
  let img = await prisma.image.findUnique({ where: { name } });
  if (img) {
    return img.url;
  }

  // 4b) Otherwise, call Unsplash
  const unsplashUrl =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(name)}` +
    `&per_page=1&client_id=${UNSPLASH_KEY}`;
  const resp = await fetch(unsplashUrl);
  if (!resp.ok) return null;
  const json = await resp.json();
  const imageUrl = json.results?.[0]?.urls?.small || null;

  // 4c) If found, cache into Prisma
  if (imageUrl) {
    img = await prisma.image.create({
      data: { name, url: imageUrl }
    });
    return img.url;
  }
  return null;
}

// 5) Main HTTP server
const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const key = `${method} ${pathname}`;

  // 5a) Handle CORS preflight
  if (method === 'OPTIONS') {
    return sendJSON(res, 204, null);
  }

  // 5b) Dispatch routes
  switch (key) {
    // ─── 6) USERS ────────────────────────────────────────────────────
    case 'GET /api/users':
      try {
        const users = await prisma.user.findMany();
        return sendJSON(res, 200, users);
      } catch (e) {
        return sendJSON(res, 500, { error: e.message });
      }

    case 'POST /api/users':
      {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            const { name, email, password } = JSON.parse(body);
            if (!name || !email || !password) {
              return sendJSON(res, 400, {
                error: 'Missing name, email, or password'
              });
            }
            const user = await prisma.user.create({
              data: { name, email, password }
            });
            return sendJSON(res, 201, user);
          } catch (e) {
            return sendJSON(res, 400, { error: e.message });
          }
        });
      }
      return; // important to break out

    // ─── 7) FOODS ────────────────────────────────────────────────────
    case 'GET /api/foods':
      {
        const userId = parseInt(parsedUrl.searchParams.get('userId'), 10);
        if (!userId) {
          return sendJSON(res, 400, { error: 'Missing userId query parameter' });
        }
        try {
          const foods = await prisma.food.findMany({
            where: { userId },
            include: { image: true }
          });
          return sendJSON(res, 200, foods);
        } catch (e) {
          return sendJSON(res, 500, { error: e.message });
        }
      }

    case 'POST /api/foods':
      {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            const {
              name,
              quantity,
              buyDate,
              expirationDate,
              barcode,
              userId
            } = JSON.parse(body);
            if (
              !name ||
              !quantity ||
              !buyDate ||
              !expirationDate ||
              !userId
            ) {
              return sendJSON(res, 400, {
                error: 'Missing required fields'
              });
            }

            // 7a) Unsplash image lookup (if configured)
            let imageUrl = null;
            if (UNSPLASH_KEY) {
              imageUrl = await getOrFetchImage(name);
            }

            // 7b) Build data for new Food
            const foodData = {
              name,
              quantity: parseInt(quantity, 10),
              buyDate: new Date(buyDate),
              expirationDate: new Date(expirationDate),
              barcode: barcode || null,
              user: { connect: { id: parseInt(userId, 10) } }
            };

            if (imageUrl) {
              foodData.image = {
                connectOrCreate: {
                  where: { name },
                  create: { name, url: imageUrl }
                }
              };
            }

            const food = await prisma.food.create({
              data: foodData,
              include: { image: true }
            });
            return sendJSON(res, 201, food);
          } catch (e) {
            return sendJSON(res, 500, { error: e.message });
          }
        });
      }
      return;

    // ─── 8) RECIPES (Spoonacular) ────────────────────────────────────
    case 'GET /api/recipes':
      {
        const ingredients = parsedUrl.searchParams.get('ingredients');
        if (!ingredients) {
          return sendJSON(res, 400, {
            error: 'Missing ingredients query parameter'
          });
        }

        try {
          // 8a) Find recipe ID
          const findParams = new URLSearchParams({
            apiKey: SPOONACULAR_KEY,
            ingredients,
            number: '1',
            ranking: '1',
            ignorePantry: 'true'
          });
          const findRes = await fetch(
            `https://api.spoonacular.com/recipes/findByIngredients?${findParams}`
          );
          if (!findRes.ok) {
            const txt = await findRes.text();
            return sendJSON(res, findRes.status, { error: txt });
          }
          const [match] = await findRes.json();
          if (!match) {
            return sendJSON(res, 404, { error: 'No recipe found' });
          }

          // 8b) Fetch recipe details
          const infoParams = new URLSearchParams({
            apiKey: SPOONACULAR_KEY,
            includeNutrition: 'false'
          });
          const infoRes = await fetch(
            `https://api.spoonacular.com/recipes/${match.id}/information?${infoParams}`
          );
          if (!infoRes.ok) {
            const txt = await infoRes.text();
            return sendJSON(res, infoRes.status, { error: txt });
          }
          const info = await infoRes.json();

          // 8c) Return simplified data
          return sendJSON(res, 200, {
            name: info.title,
            photo: info.image,
            ingredients: info.extendedIngredients.map((i) => i.original),
            instructions: info.instructions
          });
        } catch (e) {
          return sendJSON(res, 500, { error: e.message });
        }
      }

    // ─── 9) PRODUCTS (OpenFoodFacts) ────────────────────────────────────
    case 'GET /api/products':
      {
        const barcode = parsedUrl.searchParams.get('barcode');
        if (!barcode) {
          return sendJSON(res, 400, {
            error: 'Missing barcode query parameter'
          });
        }

        try {
          // 9a) Fetch from OpenFoodFacts
          const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(
            barcode
          )}.json`;
          const apiRes = await fetch(url);
          if (!apiRes.ok) {
            return sendJSON(res, apiRes.status, {
              error: 'Failed to fetch from OpenFoodFacts'
            });
          }
          const data = await apiRes.json();
          if (data.status !== 1 || !data.product) {
            return sendJSON(res, 404, { error: 'Product not found' });
          }

          const productName = data.product.product_name || 'Unknown Product';
          const imageUrl =
            data.product.image_url || data.product.image_front_url || null;

          // 9b) Cache the image (using barcode as unique key)
          let imageRecord = null;
          if (imageUrl) {
            imageRecord = await prisma.image.upsert({
              where: { name: barcode },
              update: { url: imageUrl },
              create: { name: barcode, url: imageUrl }
            });
          }

          return sendJSON(res, 200, {
            barcode,
            name: productName,
            imageUrl,
            cachedAt:
              imageRecord?.updatedAt || imageRecord?.createdAt || null
          });
        } catch (e) {
          return sendJSON(res, 500, { error: e.message });
        }
      }

    // ─── Default: 404 ────────────────────────────────────────────────────
    default:
      return sendJSON(res, 404, { error: 'Not found' });
  }
});

// 10) Start the server
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
