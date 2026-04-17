require('dotenv').config();
const axios = require('axios');

const KEY   = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-flash-latest';
const url   = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

console.log('Key prefix:', KEY ? KEY.substring(0, 16) + '...' : 'NOT SET');
console.log('Model:', MODEL);
console.log('Auth: X-goog-api-key header\n');

axios.post(url,
  { contents: [{ parts: [{ text: 'Say OK' }] }] },
  {
    timeout: 10000,
    headers: {
      'Content-Type':   'application/json',
      'X-goog-api-key': KEY,
    }
  }
)
.then(r => {
  const text = r.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('✅ WORKS! Response:', text);
})
.catch(e => {
  console.log('❌ FAILED');
  console.log('Status:', e.response?.status);
  console.log('Error:', e.response?.data?.error?.message || e.message);
});
