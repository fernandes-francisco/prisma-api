const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
require('dotenv').config();

const usersRouter = require('./users');
const foodsRouter = require('./foods');
const recipesRouter = require('./recipes');
const productsRouter = require('./products');

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:8100', process.env.ALLOWED_ORIGIN || '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight

// Middleware
app.use(express.json());

// Routes
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/foods', foodsRouter);
app.use('/api/v1/recipes', recipesRouter);
app.use('/api/v1/products', productsRouter);

module.exports = app;
module.exports.handler = serverless(app);
