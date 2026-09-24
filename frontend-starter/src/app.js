// src/App.js
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { AnimatePresence } from 'framer-motion';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import theme from './theme';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AgentConfig from './pages/AgentConfig';
import ConversationView from './pages/ConversationView';
import Analysis from './pages/Analysis';
import Templates from './pages/Templates';
import { WebSocketProvider } from './context/WebSocketContext';
import { AppDataProvider } from './context/AppDataContext';
import { MotionBox } from './components/motion';

// The workstation is designed dark-only: ignore any colour mode saved by an earlier version
const darkOnly = { type: 'localStorage', get: () => 'dark', set: () => {} };

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <MotionBox
        key={location.pathname.startsWith('/conversation') ? '/conversation' : location.pathname}
        initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/conversation/:id" element={<ConversationView />} />
          <Route path="/agent-config" element={<AgentConfig />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/analysis" element={<Analysis />} />
        </Routes>
      </MotionBox>
    </AnimatePresence>
  );
};

function App() {
  return (
    <ChakraProvider
      theme={theme}
      colorModeManager={darkOnly}
      toastOptions={{ defaultOptions: { variant: 'subtle', position: 'bottom-right', duration: 3500 } }}
    >
      <WebSocketProvider>
        <AppDataProvider>
          <Router>
            <Layout>
              <AnimatedRoutes />
            </Layout>
          </Router>
        </AppDataProvider>
      </WebSocketProvider>
    </ChakraProvider>
  );
}

export default App;
