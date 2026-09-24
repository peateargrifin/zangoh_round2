// src/context/AppDataContext.js
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getConversations, getAgents, getKnowledgeBases } from '../api';
import { useWebSocket } from './WebSocketContext';

const AppDataContext = createContext(null);
export const useAppData = () => useContext(AppDataContext);

const upsert = (list, item) => {
  const idx = list.findIndex((c) => c.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = list.slice();
  next[idx] = { ...next[idx], ...item };
  return next;
};

export const AppDataProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState({ conversations: true, agents: true, knowledgeBases: true });
  const [error, setError] = useState({ conversations: null, agents: null, knowledgeBases: null });

  const { addListener, isConnected } = useWebSocket();

  const loadConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      setConversations(
        (res.data || []).map((c) => ({ ...c, messageCount: c.messages ? c.messages.length : 0 }))
      );
      setError((prev) => ({ ...prev, conversations: null }));
    } catch (err) {
      setError((prev) => ({ ...prev, conversations: err.message }));
    } finally {
      setLoading((prev) => ({ ...prev, conversations: false }));
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadConversations(),
      getAgents()
        .then((data) => setAgents(data || []))
        .catch((err) => setError((prev) => ({ ...prev, agents: err.message })))
        .finally(() => setLoading((prev) => ({ ...prev, agents: false }))),
      getKnowledgeBases()
        .then((data) => setKnowledgeBases(data || []))
        .catch((err) => setError((prev) => ({ ...prev, knowledgeBases: err.message })))
        .finally(() => setLoading((prev) => ({ ...prev, knowledgeBases: false }))),
    ]);
  }, [loadConversations]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Re-sync after a dropped connection so no events are missed
  useEffect(() => {
    if (isConnected) loadConversations();
  }, [isConnected, loadConversations]);

  useEffect(() => {
    return addListener((msg) => {
      switch (msg.type) {
        case 'conversations_update':
          setConversations((prev) => msg.data.reduce(upsert, prev));
          break;

        case 'new_conversation':
        case 'conversation_update':
          setConversations((prev) => upsert(prev, msg.data));
          break;

        case 'message_update':
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === msg.conversationId
                ? {
                    ...conv,
                    messageCount: (conv.messageCount || 0) + 1,
                    lastMessage: msg.message,
                    hasNewMessage: msg.message.sender === 'customer',
                  }
                : conv
            )
          );
          break;

        case 'metrics_update':
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === msg.conversationId
                ? {
                    ...conv,
                    metrics: { ...conv.metrics, ...msg.metrics },
                    alertLevel: msg.alertLevel || conv.alertLevel,
                  }
                : conv
            )
          );
          break;

        case 'agent_update':
          setAgents((prev) => prev.map((a) => (a.id === msg.data.id ? { ...a, ...msg.data } : a)));
          break;

        default:
          break;
      }
    });
  }, [addListener]);

  const updateConversation = (id, data) =>
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));

  const updateAgent = (id, data) =>
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));

  return (
    <AppDataContext.Provider
      value={{
        conversations,
        agents,
        knowledgeBases,
        loading,
        error,
        updateConversation,
        updateAgent,
        reloadConversations: loadConversations,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};
