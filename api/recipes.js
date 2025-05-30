// api/recipes.js
const router = require('express').Router();
const fetch  = require('node-fetch');
require('dotenv').config();

const API_KEY       = process.env.SPOONACULAR_KEY;
const FIND_URL      = 'https://api.spoonacular.com/recipes/findByIngredients';
const INFO_URL_BASE = 'https://api.spoonacular.com/recipes'; 

/**
 * GET /api/v1/recipes?ingredients=egg,tomato,cheese
 * Returns one recipe with: name, photo, ingredients[], and instructions.
 */
router.get('/', async (req, res) => {
  try {
    const { ingredients } = req.query;
    if (!ingredients) {
      return res.status(400).json({ error: 'Missing ingredients query parameter' });
    }

    // 1) Find the best matching recipe ID
    const findParams = new URLSearchParams({
      apiKey:      API_KEY,
      ingredients: ingredients,
      number:      '1',
      ranking:     '1',
      ignorePantry:'true'
    });
    const findRes = await fetch(`${FIND_URL}?${findParams}`);
    if (!findRes.ok) {
      const txt = await findRes.text();
      return res.status(findRes.status).json({ error: txt });
    }
    const [match] = await findRes.json();
    if (!match) {
      return res.status(404).json({ error: 'No recipe found' });
    }

    const recipeId = match.id;

    // 2) Fetch full recipe information
    const infoParams = new URLSearchParams({
      apiKey: API_KEY,
      includeNutrition: 'false'
    });
    const infoRes = await fetch(`${INFO_URL_BASE}/${recipeId}/information?${infoParams}`);
    if (!infoRes.ok) {
      const txt = await infoRes.text();
      return res.status(infoRes.status).json({ error: txt });
    }
    const info = await infoRes.json();

    // 3) Extract desired fields
    const result = {
      name:         info.title,
      photo:        info.image,
      ingredients:  info.extendedIngredients.map(i => i.original),
      instructions: info.instructions // HTML string; you may strip tags on the client if needed
    };

    res.json(result);
  } catch (err) {
    console.error('Recipe API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
