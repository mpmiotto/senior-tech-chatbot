// logServer.js with SQLite

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'logs.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Create logs table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS user_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TEXT NOT NULL
  )
`);

// API endpoint to receive logs
app.post('/api/log', (req, res) => {
  console.log('Received log request:', req.body); // 🔍 Add this line
  const { userId, message, timestamp } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'Missing userId or message' });
  }

  const logEntry = {
    userId,
    message,
    timestamp: timestamp || new Date().toISOString(),
  };

  // Insert log entry into SQLite database
  db.run(
    `INSERT INTO user_logs (userId, message, timestamp) VALUES (?, ?, ?)`,
    [logEntry.userId, logEntry.message, logEntry.timestamp],
    (err) => {
      if (err) {
        console.error('Failed to insert log:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res
        .status(200)
        .json({ success: true, message: 'Log saved successfully' });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Logging server running on port ${PORT}`);
});
