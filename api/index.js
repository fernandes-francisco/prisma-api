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


app.use(cors({ origin: ['http://localhost:8100', '*'], methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.options('*', cors());
// Middleware
app.use(express.json());

// Routes
app.use('/v1/users', usersRouter);
app.use('/v1/foods', foodsRouter);
app.use('/v1/recipes', recipesRouter);
app.use('/v1/products', productsRouter);

module.exports = app;
module.exports.handler = serverless(app);
