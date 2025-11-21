
// server.js
import express from "express";
import cors from "cors";
import "dotenv/config";
import { extractJson } from "./utils/extractJson.js";

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return callback(null, true);

      const allowed = [
        "http://localhost:5173",
        "https://whatifcommunity.netlify.app",
        "https://www.whatifcommunity.co.za",
        "https://what-if-community-ap-woc9.bolt.host",
        "https://whatifcommunity.co.za"
      ];

      // Automatically allow Bolt/WebContainer preview domains
      const isBoltPreview = origin.includes(".webcontainer-api.io");

      if (allowed.includes(origin) || isBoltPreview) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json());

// --- Env check ---
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠ OPENAI_API_KEY is not set in environment");
} else {
  console.log("✅ OPENAI_API_KEY loaded (value hidden)");
}

// --- Health check route ---
app.get("/", (req, res) => {
  res.send("AI backend server running ✅");
});

/**
 * POST /api/ai
 * Body: { prompt: string, model?: string, temperature?: number, max_tokens?: number }
 */
app.post("/api/ai", async (req, res) => {
  try {
    const { prompt, model, temperature, max_tokens } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Missing 'prompt' in request body" });
    }

    console.log("🧠 [/api/ai] Incoming prompt length:", prompt.length);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY missing at request time");
      return res.status(500).json({ error: "Server misconfigured: missing API key" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ OpenAI error:", response.status, errorBody);
      return res
        .status(502)
        .json({ error: "OpenAI API error", detail: errorBody });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    // Parse JSON from the text (```json ... ``` or plain JSON)
    const meta = extractJson(text);

    console.log("📦 Parsed meta:", meta ? "OK" : "❌ No JSON detected");

    return res.json({
      success: true,
      meta, // parsed JSON (or null)
      text, // raw text from OpenAI
      raw: data,
    });
  } catch (err) {
    console.error("💥 [/api/ai] Unexpected error:", err);
    return res.status(500).json({
      error: "Server error",
      detail: String(err),
    });
  }
});

// --- Fallback error handler ---
app.use((err, req, res, next) => {
  console.error("🔥 Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// --- Start server ---
app.listen(port,"0.0.0.0", () => {
  console.log(`🚀 AI backend listening on port ${port}`);
});

// Optional: log when Railway sends SIGTERM
process.on("SIGTERM", () => {
  console.log("⛔ Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

