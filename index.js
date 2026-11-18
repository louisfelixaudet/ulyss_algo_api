import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Base Route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
