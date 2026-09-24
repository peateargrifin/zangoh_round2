// utils/broadcast.js
// Tracks connected WebSocket clients so routes and the simulator can push real-time events.
const clients = new Set();

const register = (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
};

const broadcast = (payload) => {
  const data = JSON.stringify({ ...payload, timestamp: new Date() });
  clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  });
};

// Public projection of a conversation used in list-style events
const summarize = (c) => ({
  id: c.id,
  customer: c.customer,
  agent: c.agent,
  status: c.status,
  alertLevel: c.alertLevel,
  startTime: c.startTime,
  metrics: c.metrics,
  humanIntervention: c.humanIntervention,
  messageCount: c.messages ? c.messages.length : 0,
  lastMessage: c.messages && c.messages.length ? c.messages[c.messages.length - 1] : null
});

module.exports = { register, broadcast, summarize };
