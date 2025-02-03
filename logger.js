function generateUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

// Generate or retrieve unique user identifier
function getUserIdentifier() {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem('userId', userId);
  }
  return userId;
}

// Log user activity to the backend server
async function logUserActivity(message) {
  const userId = getUserIdentifier();

  const logData = {
    userId,
    message,
    timestamp: new Date().toISOString(),
  };

  // ✅ Use this for local development
  // const LOG_SERVER_URL = 'http://localhost:4000/api/log';

  // ✅ Use this for Render deployment
  const LOG_SERVER_URL = 'https://senior-tech-chatbot.onrender.com';

  try {
    await fetch('http://localhost:4000/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    });
    console.log('Log sent successfully');
  } catch (error) {
    console.error('Failed to log user activity:', error);
  }
}
