// api/index.js
const express    = require('express');
const serverless = require('serverless-http');
const cors       = require('cors');
require('dotenv').config();

const usersRouter    = require('./users');
const foodsRouter    = require('./foods');
const recipesRouter  = require('./recipes');
const productsRouter = require('./products');

const app = express();
app.use(cors());
app.use(express.json());

// Mount all routes under /v1 instead of /api
app.use('/v1/users',    usersRouter);
app.use('/v1/foods',    foodsRouter);
app.use('/v1/recipes',  recipesRouter);
app.use('/v1/products', productsRouter);

module.exports      = app;
module.exports.handler = serverless(app);
