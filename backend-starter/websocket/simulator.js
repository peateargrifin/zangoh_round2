// websocket/simulator.js
// Simulates live customer traffic against the real database so the dashboard has
// real-time activity. Conversations under human control are never touched by the "AI".
// Disable with SIMULATE=false.
const Conversation = require('../models/conversation');
const Agent = require('../models/agent');
const { broadcast, summarize } = require('../utils/broadcast');
const { computeAlertLevel } = require('../utils/alerts');
const { replyToConversation, updateSentiment } = require('../utils/aiAgent');
const llm = require('../utils/llm');

const customerLines = [
  'Can you tell me more about my order status?',
  "I'm still waiting for a response about my return.",
  'This is taking way too long, I want a refund.',
  'How long will the shipping take?',
  'I need to change my delivery address.',
  'Is there a way to expedite this process?',
  'Thank you for your help!'
];
const names = ['James Smith', 'Mary Johnson', 'Robert Brown', 'Linda Davis', 'Michael Wilson', 'Priya Nair', 'Sofia Rossi'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

async function tickMessage() {
  const candidates = await Conversation.find({
    status: { $in: ['active', 'waiting'] },
    'humanIntervention.active': { $ne: true }
  });
  if (!candidates.length) return;
  const conv = pick(candidates);
  const agent = await Agent.findOne({ id: conv.agent && conv.agent.id });

  const message = { sender: 'customer', text: pick(customerLines), timestamp: new Date() };
  conv.messages.push(message);
  await updateSentiment(conv, message.text); // Gemini (or mock) scores the customer's message
  conv.metrics.responseTime = clamp(conv.metrics.responseTime - 1 + Math.random() * 2.5, 2, 60);
  conv.metrics.confidenceScore = clamp(conv.metrics.confidenceScore - 0.05 + Math.random() * 0.08, 0.2, 1);
  conv.alertLevel = computeAlertLevel(conv.metrics, agent && agent.escalationThresholds);
  await conv.save();

  broadcast({ type: 'message_update', conversationId: conv.id, message });
  broadcast({ type: 'metrics_update', conversationId: conv.id, metrics: conv.metrics, alertLevel: conv.alertLevel });

  // The AI agent answers using its saved configuration (temperature, max tokens, capabilities ...).
  // replyToConversation refuses if a supervisor is in control, so a take-over silences the AI.
  replyToConversation(conv.id).catch((err) => {
    if (!err.status) console.error('Simulator AI reply error:', err.message);
  });
}

const MAX_OPEN_CONVERSATIONS = 25;

async function tickNewConversation() {
  const openCount = await Conversation.countDocuments({ status: { $ne: 'resolved' } });
  if (openCount >= MAX_OPEN_CONVERSATIONS) return;
  const agents = await Agent.find({ status: 'active' });
  if (!agents.length) return;
  const agent = pick(agents);
  const metrics = {
    sentiment: 0.5 + Math.random() * 0.5,
    responseTime: 4 + Math.random() * 8,
    confidenceScore: 0.7 + Math.random() * 0.3
  };
  const now = new Date();
  const conv = await Conversation.create({
    id: `conv-${Date.now()}`,
    customer: { id: `cust-${1000 + Math.floor(Math.random() * 9000)}`, name: pick(names) },
    agent: { id: agent.id, name: agent.name },
    status: 'active',
    alertLevel: computeAlertLevel(metrics, agent.escalationThresholds),
    startTime: now,
    metrics,
    messages: [{ sender: 'customer', text: pick(customerLines), timestamp: now }],
    tags: []
  });
  broadcast({ type: 'new_conversation', data: summarize(conv) });
}

function startSimulator() {
  const guard = (fn) => () => fn().catch((err) => console.error('Simulator error:', err.message));
  // Real LLM calls are slower and rate-limited, so tick less often when Gemini is active
  const interval = Number(process.env.SIMULATOR_INTERVAL_MS) || (llm.provider() === 'gemini' ? 15000 : 6000);
  setInterval(guard(tickMessage), interval);
  setInterval(guard(tickNewConversation), 45000);
  console.log(`Conversation simulator started (LLM provider: ${llm.provider()})`);
}

module.exports = { startSimulator };
