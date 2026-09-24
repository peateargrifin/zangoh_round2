// routes/analytics.js - dashboard aggregates computed from live data
const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversation');
const Agent = require('../models/agent');

const RANGE_DAYS = { today: 1, week: 7, month: 30, year: 365 };
const round = (n, d = 2) => (n == null || Number.isNaN(n) ? 0 : Math.round(n * 10 ** d) / 10 ** d);
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

// GET /api/analytics/overview?timeRange=today|week|month|year
router.get('/overview', async (req, res, next) => {
  try {
    const days = RANGE_DAYS[req.query.timeRange] || RANGE_DAYS.week;
    const since = new Date(Date.now() - days * 86400000);
    const [all, agents] = await Promise.all([
      Conversation.find({ startTime: { $gte: since } }).lean(),
      Agent.find().lean()
    ]);

    const total = all.length;
    const resolved = all.filter((c) => c.status === 'resolved').length;
    const escalated = all.filter((c) => c.status === 'escalated' || (c.humanIntervention && c.humanIntervention.occurred)).length;
    const active = all.filter((c) => c.status === 'active' || c.status === 'waiting' || c.status === 'escalated').length;
    const rt = all.map((c) => c.metrics && c.metrics.responseTime).filter((v) => v != null);
    const sent = all.map((c) => c.metrics && c.metrics.sentiment).filter((v) => v != null);

    // Daily buckets (only days that have data)
    const buckets = {};
    all.forEach((c) => {
      const k = dayKey(c.startTime);
      (buckets[k] = buckets[k] || []).push(c);
    });
    const dates = Object.keys(buckets).sort();
    const series = (fn) => dates.map((date) => ({ date, ...fn(buckets[date]) }));

    res.json({
      activeConversations: active,
      totalConversations: total,
      resolutionRate: round(total ? resolved / total : 0),
      avgResponseTime: round(avg(rt), 1),
      avgSentiment: round(avg(sent)),
      escalationRate: round(total ? escalated / total : 0),
      alertCounts: {
        high: all.filter((c) => c.alertLevel === 'high' && c.status !== 'resolved').length,
        medium: all.filter((c) => c.alertLevel === 'medium' && c.status !== 'resolved').length,
        low: all.filter((c) => c.alertLevel === 'low' && c.status !== 'resolved').length
      },
      agents: agents.map((a) => ({ id: a.id, name: a.name, status: a.status, metrics: a.metrics })),
      trends: {
        conversations: series((cs) => ({ count: cs.length })),
        responseTime: series((cs) => ({ value: round(avg(cs.map((c) => c.metrics.responseTime)), 1) })),
        sentiment: series((cs) => ({ value: round(avg(cs.map((c) => c.metrics.sentiment))) })),
        escalations: series((cs) => ({
          value: round(cs.filter((c) => c.status === 'escalated' || (c.humanIntervention && c.humanIntervention.occurred)).length / cs.length)
        }))
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
