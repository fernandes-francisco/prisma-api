// api/products.js
const router = require('express').Router();
const fetch  = require('node-fetch');
const { PrismaClient } = require('../../generated/prisma');

const prisma = new PrismaClient();

/**
 * GET /api/v1/products?barcode=5601234567890
 * Fetches from Open Food Facts, caches image URL in DB, and returns the record.
 */
router.get('/', async (req, res) => {
  try {
    const { barcode } = req.query;
    if (!barcode) {
      return res.status(400).json({ error: 'Missing barcode query parameter' });
    }

    // 1) Fetch from Open Food Facts
    const url    = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
    const apiRes = await fetch(url);
    const data   = await apiRes.json();

    if (data.status !== 1 || !data.product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productName = data.product.product_name || 'Unknown Product';
    const imageUrl    = data.product.image_url || data.product.image_front_url || null;

    // 2) Cache into your Image table (using barcode as unique key)
    let imageRecord;
    if (imageUrl) {
      imageRecord = await prisma.image.upsert({
        where: { name: barcode },       // use barcode as the unique identifier
        update: { url: imageUrl },
        create: { name: barcode, url: imageUrl },
      });
    }

    // 3) Respond with both the fetched and cached data
    res.json({
      barcode,
      name: productName,
      imageUrl,
      cachedAt: imageRecord?.createdAt || imageRecord?.updatedAt,
    });
  } catch (err) {
    console.error('Product API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
