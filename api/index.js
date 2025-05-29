// api/index.js
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
require('dotenv').config();

const usersRouter    = require('./users');
const foodsRouter    = require('./foods');
const recipesRouter  = require('./recipes');
const productsRouter = require('./products');

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:8100', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json());

// Mount routers under /v1
app.use('/v1/users',    usersRouter);
app.use('/v1/foods',    foodsRouter);
app.use('/v1/recipes',  recipesRouter);
app.use('/v1/products', productsRouter);

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
module.exports.handler = serverless(app);