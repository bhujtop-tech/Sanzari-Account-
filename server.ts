import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '5mb' }));

// Initialize GoogleGenAI SDK with user-agent telemetry as per system guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Read-Only Smart Hinglish AI Manager Endpoint using gemini-3.8-flash
app.post('/api/ai-assistant', async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required' });
    }

    const systemInstruction = `
You are the official AI Business Manager for Sanzari Tours & Travels and Sanzari Dry Fruits.
Your persona is a warm, sharp, highly intelligent consultant who speaks fluently in **natural Hinglish** (Hindi + English mixed in Roman script).

READ-ONLY CONSTRAINT:
- You have 100% READ-ONLY access to the live business records provided in the context.

SPELLING & SLANG TOLERANCE (CRITICAL):
- Users will type with typos, spelling mistakes, shortcuts, or raw Hinglish (e.g., "Sahil wallet me kitna aaya 6 ko?", "mustk comision kitna hua", "kal kitni boking aai", "rizwn ke paas kitna balance hai").
- Automatically correct spelling errors in your mind and understand the user's intent!
- When asked about wallet income on a specific date (e.g., "Sahil wallet me kitna aaya 6 ko?"), check the WALLET TRANSACTIONS LIST for that specific date and wallet name, sum the transaction amounts accurately, and list the customer entries.

RESPONSE FORMAT:
- Be clear, direct, polite, and enthusiastic ("Assalam o Alaikum / Hello boss!").
- Use bullet points (•) and **bold numbers/names** for clarity.
- Provide exact numerical answers directly based on the context data.
`;

    const contextText = typeof context === 'string' ? context : JSON.stringify(context || {});

    const fullPrompt = `
BUSINESS DATA SNAPSHOT & TRANSACTIONS:
${contextText}

USER QUERY:
${prompt}
`;

    // Use gemini-3.8-flash for high intelligence, accurate reasoning, and fuzzy query matching
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: fullPrompt,
      config: {
        systemInstruction,
      },
    });

    const textOutput =
      response.text || 'Maaf kijiyega, response generate nahi ho paya. Kripya dubara try karein.';
    res.json({ answer: textOutput });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      error: 'Failed to process AI request',
      details: error?.message || 'Server error',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sanzari Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
