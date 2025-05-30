const router = require('express').Router();
const fetch = require('node-fetch');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();
const UNSPLASH_KEY = process.env.UNSPLASH_KEY;

// Helper to get or fetch an image URL by food name
async function getOrFetchImage(name) {
  // 1) Check cache in Image table
  let img = await prisma.image.findUnique({ where: { name } });
  if (img) return img.url;

  // 2) Fetch from Unsplash
  const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(name)}&per_page=1&client_id=${UNSPLASH_KEY}`;
  const resp = await fetch(apiUrl);
  const data = await resp.json();
  const url = data.results?.[0]?.urls?.small ?? null;

  // 3) Cache the result if found
  if (url) {
    img = await prisma.image.create({
      data: { name, url }
    });
    return img.url;
  }
  return null;
}

// GET /api/foods?userId=<id>
router.get('/', async (req, res) => {
  const userId = parseInt(req.query.userId, 10);
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const foods = await prisma.food.findMany({
      where: { userId },
      include: { image: true }
    });
    res.json(foods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/foods
router.post('/', async (req, res) => {
  const { name, quantity, buyDate, expirationDate, barcode, userId } = req.body;
  if (!name || !quantity || !buyDate || !expirationDate || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Fetch or reuse image URL
    const imageUrl = await getOrFetchImage(name);

    // Create the Food item
    const food = await prisma.food.create({
      data: {
        name,
        quantity: parseInt(quantity, 10),
        buyDate: new Date(buyDate),
        expirationDate: new Date(expirationDate),
        barcode: barcode || null,
        user: { connect: { id: parseInt(userId, 10) } },
        ...(imageUrl && {
          image: {
            connectOrCreate: {
              where: { name },
              create: { name, url: imageUrl }
            }
          }
        })
      },
      include: { image: true }
    });

    res.status(201).json(food);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
