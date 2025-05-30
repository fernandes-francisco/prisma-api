// api/v1/[...slug].js
const express    = require('express');
const serverless = require('serverless-http');
const cors       = require('cors');
require('dotenv').config();

const usersRouter    = require('../users');
const foodsRouter    = require('../foods');
const recipesRouter  = require('../recipes');
const productsRouter = require('../products');

const app = express();

// CORS
app.use(cors({ origin: ['http://localhost:8100', '*'] }));
app.options('*', cors());

app.use(express.json());

// Mount your routes under /api/v1
app.use('/api/v1/users',    usersRouter);
app.use('/api/v1/foods',    foodsRouter);
app.use('/api/v1/recipes',  recipesRouter);
app.use('/api/v1/products', productsRouter);

module.exports = app;
module.exports.handler = serverless(app);
