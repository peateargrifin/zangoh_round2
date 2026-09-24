// routes/intervene.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversation');
const { broadcast, summarize } = require('../utils/broadcast');

// Take over a conversation from the AI agent
router.post('/', async (req, res, next) => {
  try {
    const { conversationId, supervisorId, notes } = req.body;

    if (!conversationId || !supervisorId) {
      return res.status(400).json({ message: 'Conversation ID and supervisor ID are required' });
    }

    const conversation = await Conversation.findOne({ id: conversationId });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    if (conversation.status === 'resolved') {
      return res.status(409).json({ message: 'Conversation is already resolved' });
    }
    // Idempotent: taking over a conversation that is already under human control is a no-op
    if (conversation.humanIntervention && conversation.humanIntervention.active) {
      return res.json({
        message: 'Intervention recorded',
        intervention: conversation.humanIntervention
      });
    }

    conversation.humanIntervention = {
      occurred: true,
      active: true,
      supervisorId,
      timestamp: new Date(),
      notes: notes || ''
    };
    conversation.status = 'escalated';
    conversation.messages.push({
      sender: 'supervisor',
      text: 'A supervisor has joined the conversation and taken over from the AI agent.',
      timestamp: new Date()
    });

    await conversation.save();

    broadcast({ type: 'conversation_update', data: summarize(conversation) });
    broadcast({
      type: 'message_update',
      conversationId,
      message: conversation.messages[conversation.messages.length - 1]
    });

    res.json({
      message: 'Intervention recorded',
      intervention: conversation.humanIntervention
    });
  } catch (error) {
    next(error);
  }
});

// End intervention and return control to the AI agent (optionally with guidance)
router.post('/release', async (req, res, next) => {
  try {
    const { conversationId, supervisorNotes } = req.body;

    if (!conversationId) {
      return res.status(400).json({ message: 'Conversation ID is required' });
    }

    const conversation = await Conversation.findOne({ id: conversationId });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.humanIntervention || !conversation.humanIntervention.active) {
      return res.status(400).json({ message: 'No active intervention to release' });
    }

    conversation.status = 'active';
    conversation.humanIntervention.active = false;
    conversation.humanIntervention.releasedAt = new Date();
    if (supervisorNotes) {
      conversation.supervisorNotes = supervisorNotes;
      conversation.humanIntervention.releaseNotes = supervisorNotes;
    }
    conversation.messages.push({
      sender: 'supervisor',
      text: supervisorNotes
        ? `Control returned to the AI agent. Guidance: ${supervisorNotes}`
        : 'Control returned to the AI agent.',
      timestamp: new Date()
    });

    await conversation.save();

    broadcast({ type: 'conversation_update', data: summarize(conversation) });
    broadcast({
      type: 'message_update',
      conversationId,
      message: conversation.messages[conversation.messages.length - 1]
    });

    res.json({ message: 'Intervention released, control returned to agent' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
