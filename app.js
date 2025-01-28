require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const path = require("path");

// Initialize Express and OpenAI
const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the system prompt as a constant
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
7. Ensure the follow-up links are relevant to the bold heading and the user's context, and the \`data-question\` attribute matches the follow-up text.
8. Ensure that the follow-up link questions are on two separate lines.
`;

// In-memory data for context
const messages = [];

// POST endpoint (for chatbot queries)
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Add user message to in-memory store
    messages.push({ role: "user", content: message });

    // Build the conversation
    const conversation = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // GPT-4 response
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: conversation,
    });

    const assistantText = response.choices[0].message.content;

    // Add assistant response to memory
    messages.push({ role: "assistant", content: assistantText });

    res.json({ assistant: assistantText });
  } catch (error) {
    console.error("Error in POST /api/chat:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET endpoint (for hyperlinks in new tabs)
app.get("/api/chat", async (req, res) => {
  try {
    const question = req.query.question;

    if (!question) {
      return res
        .status(400)
        .json({ error: "Missing query parameter: question" });
    }

    // Build the conversation
    const conversation = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question },
    ];

    // GPT-4 response
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: conversation,
    });

    const assistantText = response.choices[0].message.content;

    res.send(assistantText); // Send response directly as plain text
  } catch (error) {
    console.error("Error in GET /api/chat:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
