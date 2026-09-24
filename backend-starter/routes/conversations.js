// routes/conversations.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversation');
const Agent = require('../models/agent');
const { simulateDelay } = require('../utils/helpers');
const { broadcast, summarize } = require('../utils/broadcast');
const { computeAlertLevel } = require('../utils/alerts');
const { replyToConversation, updateSentiment } = require('../utils/aiAgent');

// Get all conversations with pagination and filtering
router.get('/', async (req, res, next) => {
  try {
    // Extract query parameters
    const { page = 1, limit = 10, status, alertLevel, agentId } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (alertLevel) filter.alertLevel = alertLevel;
    if (agentId) filter['agent.id'] = agentId;

    // Get conversations
    const conversations = await Conversation.find(filter)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Conversation.countDocuments(filter);

    await simulateDelay(300); // Simulate network delay

    res.json({
      data: conversations,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get a specific conversation by ID
router.get('/:id', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ id: req.params.id });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    await simulateDelay(200); // Simulate network delay
    
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});


// Add a message to a conversation
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { sender, text } = req.body;
    
    if (!sender || !text) {
      return res.status(400).json({ message: 'Sender and text are required' });
    }
    
    const conversation = await Conversation.findOne({ id: req.params.id });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    const newMessage = {
      sender,
      text,
      timestamp: new Date()
    };
    
    conversation.messages.push(newMessage);
    
    // Score the customer's message (Gemini, or the mock LLM when no key is set)
    if (sender === 'customer') {
      await updateSentiment(conversation, text);
    }

    if (sender === 'customer') {
      const agent = await Agent.findOne({ id: conversation.agent && conversation.agent.id });
      conversation.alertLevel = computeAlertLevel(conversation.metrics, agent && agent.escalationThresholds);
    }

    await conversation.save();

    broadcast({ type: 'message_update', conversationId: conversation.id, message: newMessage });
    if (sender === 'customer') {
      broadcast({ type: 'metrics_update', conversationId: conversation.id, metrics: conversation.metrics, alertLevel: conversation.alertLevel });
    }

    // The AI agent answers customer messages unless a supervisor is in control
    if (sender === 'customer' && process.env.AI_AUTO_REPLY !== 'false') {
      replyToConversation(conversation.id).catch((err) => {
        if (!err.status) console.error('AI auto-reply error:', err.message);
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    next(error);
  }
});

// Update conversation status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const conversation = await Conversation.findOne({ id: req.params.id });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    if (!['active', 'waiting', 'resolved', 'escalated'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    conversation.status = status;
    
    // If resolved, set end time
    if (status === 'resolved') {
      conversation.endTime = new Date();
    }
    
    if (status === 'resolved' && conversation.humanIntervention) {
      conversation.humanIntervention.active = false;
    }

    await conversation.save();

    broadcast({ type: 'conversation_update', data: summarize(conversation) });

    res.json({ message: 'Status updated', status });
  } catch (error) {
    next(error);
  }
});

// Add tags to a conversation
router.post('/:id/tags', async (req, res, next) => {
  try {
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ message: 'Tags array is required' });
    }
    
    const conversation = await Conversation.findOne({ id: req.params.id });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Add new tags (avoid duplicates)
    const uniqueTags = [...new Set([...conversation.tags, ...tags])];
    conversation.tags = uniqueTags;
    
    await conversation.save();
    
    res.json({ message: 'Tags added', tags: conversation.tags });
  } catch (error) {
    next(error);
  }
});

// Record supervisor feedback on how the AI agent handled the conversation
router.post('/:id/feedback', async (req, res, next) => {
  try {
    const { rating, category, comment, supervisorId } = req.body;
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }

    const conversation = await Conversation.findOne({ id: req.params.id });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    conversation.feedback.push({
      supervisorId: supervisorId || 'supervisor-001',
      rating: r,
      category,
      comment,
      timestamp: new Date()
    });
    await conversation.save();

    res.status(201).json({ message: 'Feedback recorded', feedback: conversation.feedback });
  } catch (error) {
    next(error);
  }
});

module.exports = router;