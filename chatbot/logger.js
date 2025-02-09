// logger.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database setup
const dbPath = path.join(__dirname, 'logs.db');
const db = new sqlite3.Database(dbPath, (err) => {
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

// Function to log user activity
async function logUserActivity(message) {
  const userId = getUserIdentifier();
  const timestamp = new Date().toISOString();

  const query = `INSERT INTO logs (userId, message, timestamp) VALUES (?, ?, ?)`;

  return new Promise((resolve, reject) => {
    db.run(query, [userId, message, timestamp], function (err) {
      if (err) {
        console.error('Error inserting into database:', err.message);
        reject(err);
      } else {
        console.log('Activity logged successfully');
        resolve('Activity logged successfully');
      }
    });
  });
}

// Generate or retrieve unique user identifier
function getUserIdentifier() {
  if (typeof localStorage !== 'undefined') {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = generateUUID();
      localStorage.setItem('userId', userId);
    }
    return userId;
  } else {
    // Fallback for environments without localStorage
    return generateUUID();
  }
}

// UUID generator function
function generateUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

module.exports = { logUserActivity };
