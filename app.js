require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const axios = require('axios'); // ✅ Import Axios for HTTP requests
const path = require('path');

// ✅ Initialize Express and OpenAI
const app = express();
app.use(cors());
app.use(express.json());
// ✅ Add this line to serve static files (like logger.js)
app.use(express.static(__dirname));

// ✅ Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Function to log user activity to logServer.js
async function logUserActivity(message) {
  const logData = {
    userId: 'backend-logger', // Static ID for backend logs
    message,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await axios.post('http://localhost:4000/api/log', logData);
    console.log('Logged activity to logServer:', response.data);
  } catch (error) {
    console.error('Error logging activity:', error.message);
  }
}

// ✅ Function to generate Google search links
function generateGoogleSearchURL(query) {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/search?q=${encodedQuery}`;
}

// ✅ System prompt for the AI
const SYSTEM_PROMPT = `
You are a friendly, patient AI assistant specifically designed to help non-technical senior citizens with their day-to-day technology-related questions.

Your responses must:
1. Use plain language with no technical jargon.
2. Provide step-by-step instructions when explaining a process.
3. Assume the user has minimal technical knowledge (e.g., explain what a browser is if needed).
4. Offer examples or analogies to make complex ideas easier to understand.
5. Maintain an encouraging, supportive, and friendly tone throughout.
6. When listing suggestions:
   - Use **bold headings** for each suggestion.
   - After each bold heading, provide two links **on separate lines**, with valid \`data-question\` attributes:
     - Example: <a href="#" data-question="Tell me more about XYZ">Would you like more information about this?</a>
     - Example: <a href="#" data-question="How do I XYZ">Would you like step-by-step instructions?</a>
7. **If the user asks a question where a step-by-step guide is necessary**, generate a **Google search link** instead of a direct external link.
   - Example: If discussing **Ring doorbells**, generate a **Google search link for "Step-by-step guide for installing Ring Doorbell"**.
   - Format the search link as:
     <a href="https://www.google.com/search?q=step+by+step+guide+for+installing+Ring+Doorbell" target="_blank" rel="noopener noreferrer">View Step-by-Step Guide on Google</a>
8. **Ensure that follow-up links (e.g., "Tell me more about XYZ") do NOT open in a new tab.** These should be internal chatbot queries, handled through \`data-question\`.
9. Ensure the follow-up links are relevant to the bold heading and the user's context, and the \`data-question\` attribute matches the follow-up text.
`;

// ✅ In-memory message history
const messages = {};
const MAX_MESSAGES = 10; // Limit history to last 10 messages per user

// ✅ POST endpoint for chatbot UI
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('Calling logUserActivity:', message);

    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    // ✅ Log the user activity to logServer.js
    await logUserActivity(message);

    const userId = 'defaultUser'; // Default user ID for session tracking

    // ✅ Ensure message history exists
    if (!messages[userId]) {
      messages[userId] = [];
    }

    // ✅ Add user message and enforce history limit
    messages[userId].push({ role: 'user', content: message });
    if (messages[userId].length > MAX_MESSAGES) {
      messages[userId] = messages[userId].slice(-MAX_MESSAGES);
    }

    // ✅ Build conversation history with system prompt
    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages[userId],
    ];

    // ✅ Get GPT-4 response
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: conversation,
    });

    let assistantText = response.choices[0].message.content;

    // ✅ Add Google search link if needed
    const stepByStepKeywords = ['how to', 'step-by-step guide', 'installation'];
    for (let keyword of stepByStepKeywords) {
      if (message.toLowerCase().includes(keyword)) {
        const searchQuery = `Step by step guide for ${message}`;
        const googleSearchURL = generateGoogleSearchURL(searchQuery);
        assistantText += `\n\nFor the most up-to-date information, you can search Google:  
        <a href="${googleSearchURL}" target="_blank" rel="noopener noreferrer">View Step-by-Step Guide on Google</a>`;
        break;
      }
    }

    // ✅ Add assistant response to history
    messages[userId].push({ role: 'assistant', content: assistantText });
    if (messages[userId].length > MAX_MESSAGES) {
      messages[userId] = messages[userId].slice(-MAX_MESSAGES);
    }

    res.json({ assistant: assistantText });
  } catch (error) {
    console.error('Error in POST /api/chat:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET endpoint for handling direct question links
app.get('/api/chat', async (req, res) => {
  try {
    const question = req.query.question;
    if (!question) {
      return res
        .status(400)
        .json({ error: 'Missing query parameter: question' });
    }

    // ✅ Build single-question conversation
    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: conversation,
    });

    let assistantText = response.choices[0].message.content;

    const stepByStepKeywords = ['how to', 'step-by-step guide', 'installation'];
    for (let keyword of stepByStepKeywords) {
      if (question.toLowerCase().includes(keyword)) {
        const searchQuery = `Step by step guide for ${question}`;
        const googleSearchURL = generateGoogleSearchURL(searchQuery);
        assistantText += `\n\nFor the most up-to-date information, you can search Google:  
        <a href="${googleSearchURL}" target="_blank" rel="noopener noreferrer">View Step-by-Step Guide on Google</a>`;
        break;
      }
    }

    res.send(assistantText);
  } catch (error) {
    console.error('Error in GET /api/chat:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
