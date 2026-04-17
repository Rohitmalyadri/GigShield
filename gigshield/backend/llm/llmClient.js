// ─────────────────────────────────────────────────────────
// LLM CLIENT — llmClient.js (v7 — X-goog-api-key header)
// ─────────────────────────────────────────────────────────
// PRIMARY:  Gemini via X-goog-api-key header (v1beta endpoint)
//           Works with both AIzaSy and AQ. key formats
// FALLBACK: Ollama local (only if Gemini fails)
// ─────────────────────────────────────────────────────────

require('dotenv').config();
const axios = require('axios');

const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;
const GEMINI_MODEL    = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || 'qwen-balanced:latest';
const GEMINI_TIMEOUT  = 8000;
const OLLAMA_TIMEOUT  = 15000;

// Use v1beta endpoint — works with gemini-flash-latest and AQ. keys
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ask Gemini using X-goog-api-key header.
 * Works with both old (AIzaSy) and new (AQ.) key formats.
 */
async function askGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

  const body    = { contents: [{ parts: [{ text: prompt }] }] };
  const headers = {
    'Content-Type':   'application/json',
    'X-goog-api-key': GEMINI_API_KEY,
  };

  const attempt = () => axios.post(GEMINI_URL, body, { timeout: GEMINI_TIMEOUT, headers });

  let response;
  try {
    response = await attempt();
  } catch (err) {
    if (err.response?.status === 429) {
      console.warn('[LLM] Gemini 429 — waiting 3s then retrying...');
      await sleep(3000);
      response = await attempt();
    } else {
      throw err;
    }
  }

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

/**
 * Ask Ollama local model (fallback only — saves CPU when Gemini works).
 */
async function askOllama(prompt) {
  const response = await axios.post(
    `${OLLAMA_BASE_URL}/api/generate`,
    { model: OLLAMA_MODEL, prompt, stream: false },
    { timeout: OLLAMA_TIMEOUT, headers: { 'Content-Type': 'application/json' } }
  );
  const text = response.data?.response;
  if (!text) throw new Error('Ollama returned empty response');
  return text;
}

/**
 * Main entry — Gemini first, Ollama fallback.
 */
async function askLLM(prompt) {
  // ── PRIMARY: Gemini ──────────────────────────────────
  try {
    const text = await askGemini(prompt);
    console.log(`[LLM] ✅ Gemini (${GEMINI_MODEL}) responded`);
    return text;
  } catch (err) {
    console.warn(`[LLM] ⚠️  Gemini failed (${err.response?.status || err.message}) — trying Ollama`);
  }

  // ── FALLBACK: Ollama ─────────────────────────────────
  try {
    const text = await askOllama(prompt);
    console.log(`[LLM] 🔄 Ollama fallback (${OLLAMA_MODEL}) responded`);
    return text;
  } catch (err) {
    console.error(`[LLM] ❌ Ollama also failed: ${err.message}`);
    throw new Error('All LLM providers unavailable');
  }
}

module.exports = { askLLM };
