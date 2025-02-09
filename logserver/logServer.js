const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Configure CORS to allow requests from multiple origins
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'https://senior-tech-chatbot.onrender.com', // Deployed frontend
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(bodyParser.json());

// Database setup
const db = new sqlite3.Database('./logs.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database.');
    // Create logs table if it doesn't exist
    db.run(
      `CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )`,
      (err) => {
        if (err) {
          console.error('Error creating logs table:', err.message);
        } else {
          console.log('Logs table is ready.');
        }
      }
    );
  }
});

app.options('/api/log', cors()); // Handle preflight requests for /api/log

// API route to log user activity
app.post('/api/log', (req, res) => {
  const { userId, message, timestamp } = req.body;

  if (!userId || !message || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `INSERT INTO logs (userId, message, timestamp) VALUES (?, ?, ?)`;

  db.run(query, [userId, message, timestamp], function (err) {
    if (err) {
      console.error('Error inserting into database:', err.message); // Log detailed error message
      res
        .status(500)
        .json({ error: 'Failed to log activity', details: err.message }); // Include error details in the response
    } else {
      res.status(201).json({ message: 'Activity logged successfully' });
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Log server running on port ${PORT}`);
});
