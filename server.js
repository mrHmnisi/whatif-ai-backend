import express from "express";
import cors from "cors";
import "dotenv/config";
import { extractJson } from "./utils/extractJson.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY is not set in .env");
}

// Simple health check
app.get("/", (req, res) => {
  res.send("WhatIf AI backend is running ✅");
});

/**
 * POST /api/ai
 * Body: { prompt: string, model?: string, temperature?: number, max_tokens?: number }
 */
app.post("/api/ai", async (req, res) => {
  try {
    const { prompt, model, temperature, max_tokens } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing 'prompt' in request body" });
    }

    console.log("🧠 [/api/ai] Incoming prompt:", prompt);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 512,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ OpenAI error:", response.status, errorBody);
      return res.status(500).json({ error: "OpenAI API error", detail: errorBody });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    // 🔥 Parse JSON here on the server using shared util
    const meta = extractJson(text);

    console.log("📦 Parsed meta:", meta ? "OK" : "❌ No JSON detected");

    return res.json({
      success: true,
      meta,   // parsed JSON (or null)
      text,   // raw AI text string
      raw: data, // full OpenAI response for debugging
    });

  } catch (err) {
    console.error("💥 [/api/ai] Unexpected error:", err);
    return res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

app.listen(port, () => {
  console.log(`🚀 AI backend listening on port ${port}`);
});

