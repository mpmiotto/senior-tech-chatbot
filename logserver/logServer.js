const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Configure CORS to allow requests from your chatbot frontend
app.use(
  cors({
    origin: 'https://senior-tech-chatbot.onrender.com', // Replace with your actual chatbot URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(bodyParser.json());

// Database setup
const db = new sqlite3.Database('./logs.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// API route to log user activity
app.post('/api/log', (req, res) => {
  const { userId, message, timestamp } = req.body;

  if (!userId || !message || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `INSERT INTO logs (userId, message, timestamp) VALUES (?, ?, ?)`;

  db.run(query, [userId, message, timestamp], function (err) {
    if (err) {
      console.error('Error inserting into database:', err.message);
      res.status(500).json({ error: 'Failed to log activity' });
    } else {
      res.status(201).json({ message: 'Activity logged successfully' });
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Log server running on port ${PORT}`);
});
