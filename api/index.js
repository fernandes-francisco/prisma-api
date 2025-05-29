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

// 1) CORS configuration
const corsOptions = {
  origin: '*', // or specify ['http://localhost:8100'] for dev
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

app.use(express.json());

// 2) Mount routers under /v1
app.use('/v1/users',    usersRouter);
app.use('/v1/foods',    foodsRouter);
app.use('/v1/recipes',  recipesRouter);
app.use('/v1/products', productsRouter);

module.exports = app;
module.exports.handler = serverless(app);
