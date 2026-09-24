// src/components/Layout.js
import React from 'react';
import { Box } from '@chakra-ui/react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Atmosphere } from './motion';

const Layout = ({ children }) => (
  <Box position="relative" minH="100vh">
    <Atmosphere />
    <Sidebar />
    <Box position="relative" zIndex={1} ml={{ base: 0, md: '264px' }} minH="100vh">
      <Header />
      <Box as="main" px={{ base: 4, md: 10 }} pt={8} pb={20} maxW="1320px">
        {children}
      </Box>
    </Box>
  </Box>
);

export default Layout;
