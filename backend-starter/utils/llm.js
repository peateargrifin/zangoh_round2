// utils/llm.js
// LLM provider layer. Uses Google Gemini when GEMINI_API_KEY is set, otherwise (or when a Gemini
// call fails) falls back to the bundled mock LLM so the app always works.
//
//   GEMINI_API_KEY   enables Gemini
//   GEMINI_MODEL     model id (default gemini-2.5-flash)
const axios = require('axios');
const mockLlm = require('../mockLlmApi').mock;

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const model = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const hasGemini = () => !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
const provider = () => (hasGemini() ? 'gemini' : 'mock');

let lastError = null; // surfaced through /api/ai/status to make misconfiguration obvious

async function callGemini(body) {
  const res = await axios.post(`${GEMINI_BASE}/${model()}:generateContent`, body, {
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY.trim(), 'Content-Type': 'application/json' },
    timeout: 20000
  });
  return res.data;
}

const geminiErrorMessage = (err) =>
  (err.response && err.response.data && err.response.data.error && err.response.data.error.message) || err.message;

// Gemini 2.5 models "think" by default and that budget is taken from maxOutputTokens
const generationExtras = () => (model().includes('2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {});

/**
 * Build the system prompt from the agent's configuration.
 */
function buildSystemPrompt(agent, { supervisorNotes } = {}) {
  const caps = (agent.capabilities || []).filter((c) => c.enabled).map((c) => c.name);
  const kbs = (agent.knowledgeBases || []).filter((k) => k.enabled).map((k) => k.name);
  const maxWords = Math.max(15, Math.floor(((agent.parameters && agent.parameters.max_tokens) || 150) * 0.6));

  return [
    `You are "${agent.name}", an AI customer service agent for the retailer RetailPlus.`,
    agent.description ? `Role: ${agent.description}.` : '',
    'Be empathetic, solution-oriented and use clear, jargon-free language. Reply as the agent only, in plain text, never as the customer.',
    `Keep the reply under ${maxWords} words.`,
    caps.length ? `You can help with: ${caps.join(', ')}.` : 'You currently have no special capabilities enabled; only answer general questions.',
    kbs.length ? `Knowledge you may rely on: ${kbs.join(', ')}.` : 'You have no knowledge bases enabled; do not invent policies.',
    'Policy: delays over 3 business days earn 10% shipping refund; double charges are refunded in 3-5 business days plus $10 credit; ' +
      'damaged items under $50 are replaced without return. Refunds above $50 must be escalated to a supervisor. ' +
      'Escalate if the customer asks for a supervisor, mentions legal action, or is very distressed.',
    supervisorNotes ? `A human supervisor left this guidance for you, follow it: ${supervisorNotes}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

// Gemini wants alternating user/model turns starting with the user
function toGeminiContents(messages) {
  const contents = [];
  messages.forEach((m) => {
    const role = m.sender === 'customer' ? 'user' : 'model';
    const text = m.text;
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += `\n${text}`;
    else contents.push({ role, parts: [{ text }] });
  });
  while (contents.length && contents[0].role !== 'user') contents.shift();
  if (contents.length && contents[contents.length - 1].role !== 'user') {
    contents.push({ role: 'user', parts: [{ text: '(Please follow up on the conversation.)' }] });
  }
  return contents;
}

/**
 * Generate the AI agent's next reply.
 * @param {object} agent  Agent document (parameters, capabilities, knowledgeBases ...)
 * @param {Array}  messages  Conversation messages ({sender, text})
 * @returns {Promise<{text: string, confidence: number, responseTime: number, provider: string}>}
 */
async function generateReply(agent, messages, options = {}) {
  const params = agent.parameters || {};
  const started = Date.now();

  if (hasGemini()) {
    try {
      const data = await callGemini({
        systemInstruction: { parts: [{ text: buildSystemPrompt(agent, options) }] },
        contents: toGeminiContents(messages.slice(-20)),
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          topP: params.top_p ?? 1,
          maxOutputTokens: params.max_tokens ?? 150,
          ...generationExtras()
        }
      });
      const candidate = data.candidates && data.candidates[0];
      const text = candidate && candidate.content && candidate.content.parts
        ? candidate.content.parts.map((p) => p.text || '').join('').trim()
        : '';
      if (!text) throw new Error(`Empty response (finishReason: ${candidate && candidate.finishReason})`);
      lastError = null;
      // Gemini does not expose a confidence score: approximate from temperature and truncation
      const truncated = candidate.finishReason === 'MAX_TOKENS';
      return {
        text,
        confidence: clamp(1 - (params.temperature ?? 0.7) * 0.5 - (truncated ? 0.15 : 0) + (Math.random() * 0.1 - 0.05), 0.3, 0.99),
        responseTime: (Date.now() - started) / 1000,
        provider: 'gemini'
      };
    } catch (err) {
      lastError = geminiErrorMessage(err);
      console.error('Gemini reply failed, using mock LLM:', lastError);
    }
  }

  const lastCustomer = [...messages].reverse().find((m) => m.sender === 'customer');
  const content = lastCustomer ? lastCustomer.text : '';
  const intent = mockLlm.determineIntent(content);
  const text = mockLlm.generateResponse(intent, content, params, agent.knowledgeBases);
  return {
    text,
    confidence: params.temperature != null ? Math.max(0.4, 1 - params.temperature) : 0.6 + Math.random() * 0.3,
    responseTime: 0.3 + Math.random() * 0.7,
    provider: 'mock'
  };
}

/**
 * Sentiment of a piece of customer text on a 0 (very negative) .. 1 (very positive) scale.
 */
async function analyzeSentiment(text) {
  if (hasGemini()) {
    try {
      const data = await callGemini({
        systemInstruction: {
          parts: [{ text: 'You classify customer messages. Return JSON only: {"score": number between 0 (very negative/angry) and 1 (very positive), "emotion": short word}.' }]
        },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 60,
          responseMimeType: 'application/json',
          ...generationExtras()
        }
      });
      const raw = data.candidates[0].content.parts.map((p) => p.text || '').join('');
      const parsed = JSON.parse(raw);
      if (typeof parsed.score !== 'number') throw new Error('No numeric score');
      lastError = null;
      return { score: clamp(parsed.score, 0, 1), emotion: parsed.emotion || null, provider: 'gemini' };
    } catch (err) {
      lastError = geminiErrorMessage(err);
      console.error('Gemini sentiment failed, using mock LLM:', lastError);
    }
  }
  const s = mockLlm.calculateSentiment(text);
  return { score: s.score, emotion: s.emotion, provider: 'mock' };
}

const status = () => ({ provider: provider(), model: hasGemini() ? model() : 'mock', lastError });

module.exports = { generateReply, analyzeSentiment, status, provider };
