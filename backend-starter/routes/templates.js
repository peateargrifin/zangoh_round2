// routes/templates.js - response templates with {{variable}} placeholders
const express = require('express');
const router = express.Router();
const ResponseTemplate = require('../models/responseTemplate');
const { generateId } = require('../utils/helpers');

const VAR_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

// Distinct {{variable}} names used in the content, in order of appearance
const extractVariableNames = (content) => {
  const names = [];
  let m;
  VAR_PATTERN.lastIndex = 0;
  while ((m = VAR_PATTERN.exec(content)) !== null) {
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return names;
};

// Keep `variables` in sync with the content: every placeholder gets an entry,
// descriptions supplied by the client are preserved, unused entries are dropped.
const reconcileVariables = (content, supplied = []) => {
  const byName = new Map((supplied || []).map((v) => [v.name, v.description || '']));
  return extractVariableNames(content).map((name) => ({ name, description: byName.get(name) || '' }));
};

const validate = ({ name, category, content }, partial = false) => {
  const check = (value, label) => ((!partial || value !== undefined) && (!value || !String(value).trim()) ? `${label} is required` : null);
  return check(name, 'Name') || check(category, 'Category') || check(content, 'Content');
};

router.get('/', async (req, res, next) => {
  try {
    const { shared, category, search } = req.query;
    const filter = {};
    if (shared !== undefined) filter.isShared = shared === 'true';
    if (category) filter.category = category;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { content: rx }];
    }
    res.json(await ResponseTemplate.find(filter).sort({ updatedAt: -1 }));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const template = await ResponseTemplate.findOne({ id: req.params.id });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).json({ message: error });
    const { name, category, content, variables, isShared, createdBy } = req.body;
    const template = await ResponseTemplate.create({
      id: generateId('template'),
      name: name.trim(),
      category: category.trim().toLowerCase(),
      content,
      variables: reconcileVariables(content, variables),
      isShared: !!isShared,
      createdBy: createdBy || 'supervisor-001'
    });
    res.status(201).json(template);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const error = validate(req.body, true);
    if (error) return res.status(400).json({ message: error });
    const template = await ResponseTemplate.findOne({ id: req.params.id });
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const { name, category, content, variables, isShared } = req.body;
    if (name !== undefined) template.name = name.trim();
    if (category !== undefined) template.category = category.trim().toLowerCase();
    if (isShared !== undefined) template.isShared = !!isShared;
    if (content !== undefined || variables !== undefined) {
      const newContent = content !== undefined ? content : template.content;
      const supplied = variables !== undefined ? variables : template.variables.map((v) => v.toObject());
      template.content = newContent;
      template.variables = reconcileVariables(newContent, supplied);
    }
    await template.save();
    res.json(template);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await ResponseTemplate.deleteOne({ id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
