// ─────────────────────────────────────────────────────────
// LLM CLIENT — llmClient.js
// ─────────────────────────────────────────────────────────
// Single entry point for ALL AI interactions in GigShield.
// Strategy:
//   PRIMARY  → Gemini REST API (Google AI Studio, free tier)
//   FALLBACK → Ollama local (qwen-balanced running on port 11434)
//
// Uses direct axios REST calls (NOT the SDK) for reliability.
// ─────────────────────────────────────────────────────────

require('dotenv').config();

// axios makes HTTP requests — we use it for BOTH Gemini and Ollama
const axios = require('axios');

// Read all LLM config from .env
const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;
const GEMINI_MODEL    = process.env.GEMINI_MODEL    || 'gemini-2.0-flash-lite';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || 'qwen-balanced:latest';
const TIMEOUT_MS      = parseInt(process.env.LLM_TIMEOUT_MS) || 90000;

// Build the Gemini REST URL using the model name from .env
// This way changing GEMINI_MODEL in .env is all you ever need to do
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Ask Gemini 1.5 Flash via direct HTTP POST request.
 * Returns the text response string.
 * Throws if the request fails or times out.
 */
async function askGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set in .env');
  }

  // Gemini REST API expects this exact request body shape
  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt }  // The actual prompt text goes here
        ]
      }
    ]
  };

  // POST to the Gemini REST endpoint with our API key in the URL
  const response = await axios.post(GEMINI_ENDPOINT, requestBody, {
    timeout: TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' }
  });

  // Drill into the response to get the actual text
  // Structure: response.data.candidates[0].content.parts[0].text
  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  return text;
}

/**
 * Ask Ollama running locally on port 11434.
 * Uses qwen-balanced:latest as the local model.
 * Returns the text response string.
 * Throws if Ollama is not running or model is missing.
 */
async function askOllama(prompt) {
  // Ollama's generate endpoint expects: { model, prompt, stream }
  const response = await axios.post(
    `${OLLAMA_BASE_URL}/api/generate`,
    {
      model:  OLLAMA_MODEL,  // The local model name from .env
      prompt: prompt,        // The question to ask
      stream: false          // Wait for the full response (don't stream)
    },
    {
      timeout: TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' }
    }
  );

  // Ollama puts the response text in response.data.response
  const text = response.data?.response;

  if (!text) {
    throw new Error('Ollama returned an empty response');
  }

  return text;
}

/**
 * MAIN FUNCTION — call this everywhere in the codebase.
 *
 * Tries Gemini first. If Gemini fails for ANY reason
 * (no internet, quota exceeded, API error), it automatically
 * switches to Ollama. This ensures the demo never breaks.
 *
 * @param {string} prompt - The full prompt to send to the AI
 * @returns {Promise<string>} The AI's plain text response
 */
async function askLLM(prompt) {
  // ── TRY 1: GEMINI ──────────────────────────────────────
  try {
    const text = await askGemini(prompt);
    console.log('[LLM] ✅ Gemini responded');
    return text;
  } catch (err) {
    // Log the failure reason but don't crash — try the fallback immediately
    console.warn(`[LLM] ⚠️  Gemini failed: ${err.message}. Trying Ollama...`);
  }

  // ── TRY 2: OLLAMA ──────────────────────────────────────
  try {
    const text = await askOllama(prompt);
    console.log('[LLM] ✅ Ollama fallback responded');
    return text;
  } catch (err) {
    console.error(`[LLM] ❌ Ollama also failed: ${err.message}`);
    // Both failed — throw so the caller can use its own fallback string
    throw new Error('All LLM providers unavailable');
  }
}

module.exports = { askLLM };
