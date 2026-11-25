import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import routes from '#routes';
import { syncVisibilite, ULYS_API_URL } from '#controlleur/video_controlleur.js';
import { logErreur } from './src/log/training_log.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connecte a MangoDB');

    // rattrape les videos supprimees ou cachees pendant que l'algo etait eteint
    syncVisibilite().catch(err => logErreur('sync des videos au demarrage', err));
  })
  .catch(err => logErreur('connexion mongoDB', err));

// Base Route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Routes de l'API
app.use('/', routes);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`api_ulys : ${ULYS_API_URL}`);
  if (!process.env.ULYS_API_URL) console.warn('ULYS_API_URL absente du .env : adresse locale utilisee par defaut');
});
