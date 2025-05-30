const express    = require('express');
const serverless = require('serverless-http');
const cors       = require('cors');
require('dotenv').config();

// Import routers
const usersRouter    = require('./users');
const foodsRouter    = require('./foods');
const recipesRouter  = require('./recipes');
const productsRouter = require('./products');

const app = express();

// Global CORS (including preflight)
app.use(cors({
  origin: ['http://localhost:8100', '*'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors()); // preflight responses

// JSON parsing for POST/PUT
app.use(express.json());

// Mount sub-routers exactly where Vercel routes them
app.use('/api/v1/users',    usersRouter);
app.use('/api/v1/foods',    foodsRouter);
app.use('/api/v1/recipes',  recipesRouter);
app.use('/api/v1/products', productsRouter);

module.exports = app;
module.exports.handler = serverless(app);
