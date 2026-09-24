// websocket/socketHandler.js
// WebSocket handler for real-time updates. Live events (messages, metrics, status changes)
// are pushed to every registered client through utils/broadcast.
const Conversation = require('../models/conversation');
const { register, summarize } = require('../utils/broadcast');

const send = (ws, payload) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ ...payload, timestamp: new Date() }));
};

async function sendConversations(ws, agentId) {
  const filter = agentId ? { 'agent.id': agentId } : {};
  const list = await Conversation.find(filter).sort({ startTime: -1 }).limit(100);
  send(ws, { type: 'conversations_update', data: list.map(summarize) });
}

module.exports = (ws) => {
  console.log('WebSocket client connected');
  register(ws);

  send(ws, { type: 'connection', message: 'Connected to Agent Supervisor WebSocket server' });

  const pingInterval = setInterval(() => send(ws, { type: 'ping' }), 30000);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);
      switch (msg.type) {
        case 'subscribe':
          send(ws, {
            type: 'subscription_confirmation',
            channel: msg.channel,
            message: `Subscribed to ${msg.channel}`
          });
          if (msg.channel === 'conversations') {
            await sendConversations(ws, msg.parameters && msg.parameters.agentId);
          }
          break;
        case 'pong':
          break;
        default:
          console.log('Received unknown WebSocket message type:', msg.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clearInterval(pingInterval);
  });
};
