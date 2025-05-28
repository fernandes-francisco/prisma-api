const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
require('dotenv').config();

const usersRouter = require('./users');
const foodsRouter = require('./foods');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/users', usersRouter);
app.use('/api/v1/foods', foodsRouter);

module.exports = app;
module.exports.handler = serverless(app);
