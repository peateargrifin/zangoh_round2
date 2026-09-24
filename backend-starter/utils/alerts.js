// utils/alerts.js
// Derives a conversation alert level from live metrics and the agent's escalation thresholds.
const DEFAULTS = { lowConfidence: 0.4, negativeSentiment: 0.3, responseTime: 20 };

function computeAlertLevel(metrics = {}, thresholds = {}) {
  const raw = thresholds && thresholds.toObject ? thresholds.toObject() : thresholds || {};
  const t = { ...DEFAULTS, ...raw };
  const badSentiment = metrics.sentiment != null && metrics.sentiment < t.negativeSentiment;
  const lowConfidence = metrics.confidenceScore != null && metrics.confidenceScore < t.lowConfidence;
  const slow = metrics.responseTime != null && metrics.responseTime > t.responseTime;

  const breaches = [badSentiment, lowConfidence, slow].filter(Boolean).length;
  if (badSentiment || breaches >= 2) return 'high';
  if (breaches === 1) return 'medium';
  return 'low';
}

module.exports = { computeAlertLevel };
