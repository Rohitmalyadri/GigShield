// ─────────────────────────────────────────────────────────
// LLM CLIENT — llmClient.js (v4 — Gemini Flash priority)
// ─────────────────────────────────────────────────────────
// PRIMARY:  Gemini 1.5 Flash (stable free tier model)
// FALLBACK: Ollama local (only if Gemini fails or unavailable)
//
// Key changes from v3:
//  - Uses gemini-1.5-flash (stable) not gemini-2.5-flash (preview, flaky)
//  - Gemini timeout cut to 5s so Ollama fallback is faster
//  - Ollama is ONLY loaded if Gemini fails — saves RAM during demo
//  - Better error logging so you can see exactly which model responded
// ─────────────────────────────────────────────────────────

require('dotenv').config();
const axios = require('axios');

const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;
// Use stable 1.5-flash as primary — 2.5-flash preview is unreliable on free tier
const GEMINI_MODEL    = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || 'qwen-balanced:latest';

// Gemini gets 5s — fast fail so Ollama isn't blocked waiting
const GEMINI_TIMEOUT_MS = 5000;
// Ollama gets full 15s — local model needs more time
const OLLAMA_TIMEOUT_MS = 15000;

// Gemini REST endpoint
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ask Gemini via REST API.
 * Uses gemini-1.5-flash — stable, fast, generous free quota.
 * On 429 (rate limit), waits 3s and retries once.
 */
async function askGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

  const body = { contents: [{ parts: [{ text: prompt }] }] };

  const attempt = () => axios.post(GEMINI_ENDPOINT, body, {
    timeout: GEMINI_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' }
  });

  let response;
  try {
    response = await attempt();
  } catch (err) {
    if (err.response?.status === 429) {
      console.warn('[LLM] Gemini 429 rate limit — waiting 3s then retrying...');
      await sleep(3000);
      response = await attempt();
    } else if (err.code === 'ECONNABORTED') {
      throw new Error(`Gemini timeout after ${GEMINI_TIMEOUT_MS}ms`);
    } else {
      throw err;
    }
  }

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

/**
 * Ask Ollama local model.
 * Only called if Gemini fails — saves CPU/RAM during normal operation.
 */
async function askOllama(prompt) {
  const response = await axios.post(
    `${OLLAMA_BASE_URL}/api/generate`,
    { model: OLLAMA_MODEL, prompt, stream: false },
    { timeout: OLLAMA_TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } }
  );
  const text = response.data?.response;
  if (!text) throw new Error('Ollama returned empty response');
  return text;
}

/**
 * Main LLM function.
 * ORDER: Gemini 1.5 Flash → Ollama (fallback only if Gemini unavailable)
 *
 * Ollama will NOT run if Gemini succeeds — no wasted compute.
 */
async function askLLM(prompt) {
  // ── PRIMARY: Gemini Flash ──────────────────────────────
  try {
    const text = await askGemini(prompt);
    console.log(`[LLM] ✅ Gemini (${GEMINI_MODEL}) responded`);
    return text;
  } catch (err) {
    console.warn(`[LLM] ⚠️  Gemini failed (${err.message}) — falling back to Ollama`);
  }

  // ── FALLBACK: Ollama local ────────────────────────────
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
