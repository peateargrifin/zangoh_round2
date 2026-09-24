// routes/presets.js - saved agent configuration presets
const express = require('express');
const router = express.Router();
const Preset = require('../models/preset');
const { generateId } = require('../utils/helpers');

router.get('/', async (_req, res, next) => {
  try {
    res.json(await Preset.find().sort({ createdAt: -1 }));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description, agentId, parameters, capabilities, knowledgeBases, escalationThresholds } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Preset name is required' });
    const preset = await Preset.create({
      id: generateId('preset'),
      name: name.trim(),
      description,
      agentId,
      parameters,
      capabilities,
      knowledgeBases,
      escalationThresholds,
      createdBy: req.body.createdBy || 'supervisor-001'
    });
    res.status(201).json(preset);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Preset.deleteOne({ id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Preset not found' });
    res.json({ message: 'Preset deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
