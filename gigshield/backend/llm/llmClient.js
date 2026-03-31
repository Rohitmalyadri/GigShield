// ─────────────────────────────────────────────────────────
// LLM CLIENT — llmClient.js (v3 — Rate-limit safe)
// ─────────────────────────────────────────────────────────
// PRIMARY:  Gemini 2.5 Flash (REST API direct)
// FALLBACK: Ollama local (qwen-balanced:latest)
//
// Key change from v2: handles Gemini 429 (rate limit) by
// waiting 2 seconds and retrying ONCE before falling back
// to Ollama. This prevents rapid-fire requests from all
// failing simultaneously during a demo simulation run.
// ─────────────────────────────────────────────────────────

require('dotenv').config();
const axios = require('axios');

const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;
const GEMINI_MODEL    = process.env.GEMINI_MODEL    || 'gemini-2.5-flash';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || 'qwen-balanced:latest';
const TIMEOUT_MS      = parseInt(process.env.LLM_TIMEOUT_MS) || 8000;

// Gemini REST endpoint — reads model from .env dynamically
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Simple sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ask Gemini via direct REST call.
 * On 429 (rate limit), waits 2 seconds and retries once.
 */
async function askGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

  const body = { contents: [{ parts: [{ text: prompt }] }] };

  const attempt = async () =>
    axios.post(GEMINI_ENDPOINT, body, {
      timeout: TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' }
    });

  let response;
  try {
    response = await attempt();
  } catch (err) {
    // On 429: wait 2 seconds then try exactly once more
    if (err.response?.status === 429) {
      console.warn('[LLM] Gemini 429 — waiting 2s then retrying...');
      await sleep(2000);
      response = await attempt(); // Will throw if it fails again — caught by askLLM
    } else {
      throw err;
    }
  }

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

/**
 * Ask Ollama local model (fallback).
 */
async function askOllama(prompt) {
  const response = await axios.post(
    `${OLLAMA_BASE_URL}/api/generate`,
    { model: OLLAMA_MODEL, prompt, stream: false },
    { timeout: TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } }
  );
  const text = response.data?.response;
  if (!text) throw new Error('Ollama returned empty response');
  return text;
}

/**
 * Main LLM function — Gemini first, Ollama fallback.
 * If both fail, throws so the caller can use its own fallback string.
 */
async function askLLM(prompt) {
  try {
    const text = await askGemini(prompt);
    console.log('[LLM] ✅ Gemini responded');
    return text;
  } catch (err) {
    console.warn(`[LLM] ⚠️  Gemini failed: ${err.message}. Trying Ollama...`);
  }

  try {
    const text = await askOllama(prompt);
    console.log('[LLM] ✅ Ollama fallback responded');
    return text;
  } catch (err) {
    console.error(`[LLM] ❌ Ollama failed: ${err.message}`);
    throw new Error('All LLM providers unavailable');
  }
}

module.exports = { askLLM };
