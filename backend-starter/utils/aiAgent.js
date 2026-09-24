// utils/aiAgent.js
// Makes the AI agent act on a stored conversation: reads the agent's saved configuration,
// asks the LLM for the next reply, stores it and pushes it to connected clients.
const Conversation = require('../models/conversation');
const Agent = require('../models/agent');
const llm = require('./llm');
const { broadcast } = require('./broadcast');
const { computeAlertLevel } = require('./alerts');

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

class AiReplyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Generate and store the agent's reply for a conversation.
 * Refuses while a human is in control or the conversation is resolved.
 */
async function replyToConversation(conversationId) {
  const conv = await Conversation.findOne({ id: conversationId });
  if (!conv) throw new AiReplyError(404, 'Conversation not found');
  if (conv.status === 'resolved') throw new AiReplyError(409, 'Conversation is resolved');
  if (conv.humanIntervention && conv.humanIntervention.active) {
    throw new AiReplyError(409, 'A supervisor is in control of this conversation');
  }

  const agent = await Agent.findOne({ id: conv.agent && conv.agent.id });
  if (!agent) throw new AiReplyError(404, 'Agent not found');
  if (agent.status !== 'active') throw new AiReplyError(409, `Agent is ${agent.status}`);

  const result = await llm.generateReply(agent, conv.messages, { supervisorNotes: conv.supervisorNotes });

  // Re-read: a supervisor may have taken over while the LLM was thinking
  const fresh = await Conversation.findOne({ id: conversationId });
  if (fresh.humanIntervention && fresh.humanIntervention.active) {
    throw new AiReplyError(409, 'A supervisor took over while the reply was being generated');
  }

  const message = { sender: 'agent', text: result.text, timestamp: new Date() };
  fresh.messages.push(message);
  fresh.metrics.confidenceScore = clamp(result.confidence, 0, 1);
  fresh.metrics.responseTime = Math.round((fresh.metrics.responseTime * 0.7 + result.responseTime * 0.3) * 10) / 10 || fresh.metrics.responseTime;
  fresh.alertLevel = computeAlertLevel(fresh.metrics, agent.escalationThresholds);
  await fresh.save();

  broadcast({ type: 'message_update', conversationId, message });
  broadcast({ type: 'metrics_update', conversationId, metrics: fresh.metrics, alertLevel: fresh.alertLevel });

  return { message, metrics: fresh.metrics, alertLevel: fresh.alertLevel, provider: result.provider };
}

/**
 * Blend the sentiment of a new customer message into the conversation's running sentiment,
 * so a single message nudges (not resets) the score.
 */
async function updateSentiment(conv, text) {
  const s = await llm.analyzeSentiment(text);
  const previous = conv.metrics.sentiment != null ? conv.metrics.sentiment : s.score;
  conv.metrics.sentiment = clamp(previous * 0.5 + s.score * 0.5, 0.05, 1);
  return s;
}

module.exports = { replyToConversation, updateSentiment, AiReplyError };
