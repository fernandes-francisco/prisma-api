// api/index.js
const express    = require('express');
const serverless = require('serverless-http');
const cors       = require('cors');
require('dotenv').config();

// Import your routers
const usersRouter    = require('./users');
const foodsRouter    = require('./foods');
const recipesRouter  = require('./recipes');
const productsRouter = require('./products');

const app = express();

// 1) Global CORS setup
app.use(cors({ 
  origin: ['http://localhost:8100'], // your Ionic dev origin
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// 2) Explicitly handle OPTIONS preflight for every path
app.options('*', (req, res) => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:8100');
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.sendStatus(204);
});

// 3) JSON body parsing
app.use(express.json());

// 4) Mount your versioned routers
app.use('/v1/users',    usersRouter);
app.use('/v1/foods',    foodsRouter);
app.use('/v1/recipes',  recipesRouter);
app.use('/v1/products', productsRouter);

// 5) Export for Vercel
module.exports = app;
module.exports.handler = serverless(app);
