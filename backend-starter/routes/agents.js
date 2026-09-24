// routes/agents.js
const express = require('express');
const router = express.Router();
const Agent = require('../models/agent');
const Conversation = require('../models/conversation');
const { simulateDelay } = require('../utils/helpers');
const { broadcast, summarize } = require('../utils/broadcast');
const { computeAlertLevel } = require('../utils/alerts');

// Returns an error message if any provided value is out of range
function validateConfig({ parameters, escalationThresholds }) {
  const inRange = (v, min, max) => typeof v === 'number' && v >= min && v <= max;
  if (parameters) {
    if (parameters.temperature !== undefined && !inRange(parameters.temperature, 0, 1)) return 'temperature must be between 0 and 1';
    if (parameters.max_tokens !== undefined && !inRange(parameters.max_tokens, 1, 4096)) return 'max_tokens must be between 1 and 4096';
    if (parameters.top_p !== undefined && !inRange(parameters.top_p, 0, 1)) return 'top_p must be between 0 and 1';
  }
  if (escalationThresholds) {
    const { lowConfidence, negativeSentiment, responseTime } = escalationThresholds;
    if (lowConfidence !== undefined && !inRange(lowConfidence, 0, 1)) return 'lowConfidence must be between 0 and 1';
    if (negativeSentiment !== undefined && !inRange(negativeSentiment, 0, 1)) return 'negativeSentiment must be between 0 and 1';
    if (responseTime !== undefined && !inRange(responseTime, 1, 600)) return 'responseTime must be between 1 and 600 seconds';
  }
  return null;
}

// Get all agents
router.get('/', async (req, res, next) => {
  try {
    const agents = await Agent.find();
    
    await simulateDelay(200); // Simulate network delay
    
    res.json(agents);
  } catch (error) {
    next(error);
  }
});

// Get a specific agent
router.get('/:id', async (req, res, next) => {
  try {
    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    await simulateDelay(200); // Simulate network delay
    
    res.json(agent);
  } catch (error) {
    next(error);
  }
});

// Update agent configuration
router.patch('/:id/config', async (req, res, next) => {
  try {
    const { parameters, capabilities, knowledgeBases, escalationThresholds } = req.body;
    
    const validationError = validateConfig(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Update only provided fields
    if (parameters) agent.parameters = { ...agent.parameters, ...parameters };
    
    if (capabilities) {
      capabilities.forEach(cap => {
        const existing = agent.capabilities.find(c => c.id === cap.id);
        if (existing) {
          existing.enabled = cap.enabled;
        }
      });
    }
    
    if (knowledgeBases) {
      knowledgeBases.forEach(kb => {
        const existing = agent.knowledgeBases.find(k => k.id === kb.id);
        if (existing) {
          existing.enabled = kb.enabled;
        }
      });
    }
    
    if (escalationThresholds) {
      agent.escalationThresholds = { ...agent.escalationThresholds, ...escalationThresholds };
    }
    
    await agent.save();

    // New thresholds change what counts as problematic: re-evaluate this agent's open conversations
    if (escalationThresholds) {
      const open = await Conversation.find({ 'agent.id': agent.id, status: { $ne: 'resolved' } });
      for (const conv of open) {
        const level = computeAlertLevel(conv.metrics, agent.escalationThresholds);
        if (level !== conv.alertLevel) {
          conv.alertLevel = level;
          await conv.save();
          broadcast({ type: 'conversation_update', data: summarize(conv) });
        }
      }
    }
    broadcast({ type: 'agent_update', data: agent });

    res.json({ message: 'Agent configuration updated', agent });
  } catch (error) {
    next(error);
  }
});

// Get agent performance metrics
router.get('/:id/metrics', async (req, res, next) => {
  try {
    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // This would normally fetch metrics from analytics service
    const metrics = agent.metrics || {
      conversations: 0,
      avgResponseTime: 0,
      satisfaction: 0,
      escalationRate: 0,
      topIssues: []
    };
    
    await simulateDelay(300); // Simulate network delay
    
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

module.exports = router;