require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const fetch = require("node-fetch"); // Required for YouTube link validation

// Initialize Express and OpenAI
const app = express();
app.use(cors());
app.use(express.json());
const path = require("path");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to check if a YouTube video is valid by verifying response content
async function checkYouTubeVideo(url) {
  try {
    const response = await fetch(url);
    const text = await response.text();

    // Check if the page contains the unavailable message
    if (text.includes("This video isn't available anymore")) {
      console.log(`Invalid YouTube video detected: ${url}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("YouTube validation error:", error);
    return false; // Assume invalid if an error occurs
  }
}

// Define the system prompt
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
7. **If the user asks a question where a step-by-step guide is necessary**, and if you can identify a **highly utilized and popular external tutorial (such as from a manufacturer, trusted tech site, or well-rated YouTube guide), provide the direct link** as part of your response.
   - Example: If discussing **Ring doorbells**, provide a **link to Ring’s official installation guide** or a highly-rated YouTube video.
   - If an **official or widely trusted guide is unavailable**, do not include a link.
8. **If providing an external link:**
   - The link must be **valid and accessible** at the time of response.
   - Format it as: <a href="EXTERNAL_LINK" target="_blank" rel="noopener noreferrer">View Step-by-Step Guide</a>.
   - If a **relevant guide is not available**, do **not** include a broken link. Instead, suggest a general web search.
9. **Ensure that follow-up links (e.g., "Tell me more about XYZ") do NOT open in a new tab.** These should be internal chatbot queries, handled through \`data-question\`.
10. Ensure the follow-up links are relevant to the bold heading and the user's context, and the \`data-question\` attribute matches the follow-up text.
`;

// In-memory message history
const messages = {};
const MAX_MESSAGES = 10; // Limit history to last 10 messages per user

// POST endpoint (for chatbot UI)
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    const userId = "defaultUser"; // Remove user-specific storage for now

    // Ensure user message history exists
    if (!messages[userId]) {
      messages[userId] = [];
    }

    // Add user message and enforce history limit
    messages[userId].push({ role: "user", content: message });
    if (messages[userId].length > MAX_MESSAGES) {
      messages[userId] = messages[userId].slice(-MAX_MESSAGES);
    }

    // Build conversation history with system prompt
    const conversation = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages[userId],
    ];

    // GPT-4 response
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: conversation,
    });

    let assistantText = response.choices[0].message.content;

    // Check for YouTube links in the response
    const youtubeRegex = /https:\/\/www\.youtube\.com\/watch\?v=[\w-]+/g;
    let youtubeLinks = assistantText.match(youtubeRegex);

    if (youtubeLinks) {
      for (let youtubeURL of youtubeLinks) {
        const isValid = await checkYouTubeVideo(youtubeURL);
        if (!isValid) {
          assistantText = assistantText.replace(
            youtubeURL,
            "(The suggested video is unavailable, please search YouTube manually.)"
          );
        }
      }
    }

    // Add assistant response to history
    messages[userId].push({ role: "assistant", content: assistantText });
    if (messages[userId].length > MAX_MESSAGES) {
      messages[userId] = messages[userId].slice(-MAX_MESSAGES);
    }

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

    // Build conversation with system prompt and single user query
    const conversation = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question },
    ];

    // GPT-4 response
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: conversation,
    });

    let assistantText = response.choices[0].message.content;

    // Validate YouTube links in GET responses
    const youtubeRegex = /https:\/\/www\.youtube\.com\/watch\?v=[\w-]+/g;
    let youtubeLinks = assistantText.match(youtubeRegex);

    if (youtubeLinks) {
      for (let youtubeURL of youtubeLinks) {
        const isValid = await checkYouTubeVideo(youtubeURL);
        if (!isValid) {
          assistantText = assistantText.replace(
            youtubeURL,
            "(The suggested video is unavailable, please search YouTube manually.)"
          );
        }
      }
    }

    res.send(assistantText);
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
