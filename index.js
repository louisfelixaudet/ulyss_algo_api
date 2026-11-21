import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import routes from '#routes';

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

// Routes de l'API
app.use('/', routes);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
