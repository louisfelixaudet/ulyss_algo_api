import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import routes from '#routes';
import { syncVisibilite } from '#controlleur/video_controlleur.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connecte a MangoDB');

    // rattrape les videos supprimees ou cachees pendant que l'algo etait eteint
    syncVisibilite().catch(err => console.error('sync des videos :', err.message));
  })
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
