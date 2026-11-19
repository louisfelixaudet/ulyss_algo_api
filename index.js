import express from 'express';

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connecte a MangoDB'))
  .catch(err => console.error('errer mongoDB :', err.message));

// Base Route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start Server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
});
