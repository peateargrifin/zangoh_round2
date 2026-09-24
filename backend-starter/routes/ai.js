// routes/ai.js - AI agent endpoints backed by Gemini (or the mock LLM when no key is configured)
const express = require('express');
const router = express.Router();
const llm = require('../utils/llm');
const { replyToConversation, AiReplyError } = require('../utils/aiAgent');
const Agent = require('../models/agent');

// GET /api/ai/status - which provider is active (never returns the key)
router.get('/status', (_req, res) => {
  res.json(llm.status());
});

// POST /api/ai/reply { conversationId } - the conversation's AI agent answers now
router.post('/reply', async (req, res, next) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) return res.status(400).json({ message: 'conversationId is required' });
    res.status(201).json(await replyToConversation(conversationId));
  } catch (err) {
    if (err instanceof AiReplyError) return res.status(err.status).json({ message: err.message });
    next(err);
  }
});

// POST /api/ai/sentiment { text } -> { sentiment: 0..1, emotion, provider }
router.post('/sentiment', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) return res.status(400).json({ message: 'text is required' });
    const s = await llm.analyzeSentiment(String(text));
    res.json({ sentiment: s.score, emotion: s.emotion, provider: s.provider });
  } catch (err) { next(err); }
});

// POST /api/ai/test-reply { agentId, message } - try an agent's current configuration without a conversation
router.post('/test-reply', async (req, res, next) => {
  try {
    const { agentId, message } = req.body;
    if (!agentId || !message) return res.status(400).json({ message: 'agentId and message are required' });
    const agent = await Agent.findOne({ id: agentId });
    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    const result = await llm.generateReply(agent, [{ sender: 'customer', text: message }]);
    res.json({ reply: result.text, confidence: result.confidence, provider: result.provider, parameters: agent.parameters });
  } catch (err) { next(err); }
});

module.exports = router;
