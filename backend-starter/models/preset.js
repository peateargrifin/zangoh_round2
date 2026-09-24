// models/preset.js
const mongoose = require('mongoose');

const presetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  agentId: String, // agent the preset was saved from; presets can be applied to any agent
  parameters: {
    temperature: Number,
    max_tokens: Number,
    top_p: Number
  },
  capabilities: [{ id: String, enabled: Boolean }],
  knowledgeBases: [{ id: String, enabled: Boolean }],
  escalationThresholds: {
    lowConfidence: Number,
    negativeSentiment: Number,
    responseTime: Number
  },
  createdBy: String
}, { timestamps: true });

module.exports = mongoose.model('Preset', presetSchema);
