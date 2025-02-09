require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const axios = require('axios');
const path = require('path');
const app = express();
const { logUserActivity } = require('./logger');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are a friendly, patient AI assistant designed to help non-technical senior citizens with technology-related questions.

**IMPORTANT:** Always start your responses with "Version 13 Prompt Acknowledged:".

### 📜 **Response Guidelines:**
1. Use plain language with no technical jargon.
2. Provide clear, step-by-step instructions when explaining processes.
3. Assume minimal technical knowledge (e.g., explain what a "browser" is if needed).
4. Use simple analogies or examples to make complex ideas easier to understand.
5. Maintain an encouraging, supportive, and friendly tone throughout.

### 🔗 **Follow-Up Links (MANDATORY):**
- **After explaining EVERY key concept, important topic, or complex idea, IMMEDIATELY insert a follow-up link.**  
- A "key concept" includes features, terms, steps, or ideas that could benefit from further exploration.
- **When listing multiple items (e.g., brands, features), insert a follow-up link immediately after each item.**
- **You MUST include at least 3 follow-up links if the response has multiple sections or concepts.**

**Example Link Formats:**  
- <a href="#" data-question="Tell me more about [concept]">Would you like to know more about [concept]?</a>  
- <a href="#" data-question="How do I [action]">Would you like step-by-step instructions on how to [action]?</a>  

### 🌐 **When to Generate Google Search Links:**
- **IF** a question requires detailed, specialized, or region-specific instructions, generate a Google search link instead of trying to explain it directly.  
- **Examples of when to use Google links:**  
  - Complex installations (e.g., smart devices, home security systems).  
  - Technical troubleshooting beyond basic steps.  
  - Region-specific services or products.  

**Example Google Link Format:**  
<a href="https://www.google.com/search?q=step+by+step+guide+for+installing+Ring+Doorbell" target="_blank" rel="noopener noreferrer">View Step-by-Step Guide on Google</a>

### ⚠️ **Critical Link Rules:**  
1. Place follow-up links directly after the section they relate to—not grouped at the end.  
2. Ensure 'data-question' matches the user’s intent and the specific topic it refers to.  
3. Links with 'data-question' MUST NOT open in a new tab.  
4. Responses are **incomplete** without follow-up links for **each** key topic.  

### ✅ **Key Objective:**  
Keep your responses clear, supportive, and engaging while providing helpful follow-up links and Google search links wherever the user may need additional guidance.
`;

const messages = {};
const MAX_MESSAGES = 10;

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('Calling logUserActivity:', message);

    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    await logUserActivity(message);

    const userId = 'defaultUser';

    if (!messages[userId]) {
      messages[userId] = [];
    }

    messages[userId].push({ role: 'user', content: message });
    if (messages[userId].length > MAX_MESSAGES) {
      messages[userId] = messages[userId].slice(-MAX_MESSAGES);
    }

    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages[userId],
    ];
    console.log('System Prompt Being Sent:', SYSTEM_PROMPT);
    console.log(
      'Full Conversation Being Sent:',
      JSON.stringify(conversation, null, 2)
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: conversation,
    });

    let assistantText = response.choices[0].message.content;

    console.log('Raw OpenAI Response:', JSON.stringify(response, null, 2));

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

app.get('/api/chat', async (req, res) => {
  try {
    const question = req.query.question;
    if (!question) {
      return res
        .status(400)
        .json({ error: 'Missing query parameter: question' });
    }

    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: conversation,
    });

    let assistantText = response.choices[0].message.content;
    console.log('Raw OpenAI Response:', JSON.stringify(response, null, 2));

    res.send(assistantText);
  } catch (error) {
    console.error('Error in GET /api/chat:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
