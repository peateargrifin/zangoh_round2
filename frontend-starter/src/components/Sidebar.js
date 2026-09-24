// src/components/Sidebar.js
// A frosted dark column. Numbered like the contents page of an art book; a persimmon marker slides to the active entry.
import React from 'react';
import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LiveDot, MotionBox, Reveal } from './motion';

const navItems = [
  { no: '01', name: 'Dashboard', path: '/' },
  { no: '02', name: 'Templates', path: '/templates' },
  { no: '03', name: 'AI Agent', path: '/agent-config' },
  { no: '04', name: 'Analysis', path: '/analysis' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { agents, conversations } = useAppData();
  const { isConnected } = useWebSocket();

  const path = location.pathname.toLowerCase();
  const isActive = (p) => (p === '/' ? path === '/' || path.startsWith('/conversation') : path === p);
  const inControl = conversations.filter((c) => c.humanIntervention?.active).length;

  return (
    <Flex
      as="aside"
      direction="column"
      position="fixed"
      left={0}
      top={0}
      bottom={0}
      w="264px"
      display={{ base: 'none', md: 'flex' }}
      zIndex={20}
      bg="rgba(23,25,34,.55)"
      borderRight="1px solid rgba(232,226,216,.08)"
      backdropFilter="blur(22px) saturate(115%)"
      px={8}
      py={9}
    >
      <Reveal>
        <Text textStyle="eyebrow" mb={2}>
          Zangoh
        </Text>
        <Text fontFamily="heading" fontSize="34px" fontWeight={300} fontStyle="italic" lineHeight="0.95" letterSpacing="-0.03em">
          Supervisor
          <Box as="span" color="brand.500" fontStyle="normal">
            .
          </Box>
        </Text>
      </Reveal>

      <VStack as="nav" spacing={0} align="stretch" mt={14}>
        {navItems.map((item, i) => {
          const active = isActive(item.path);
          return (
            <Reveal key={item.path} index={i + 1}>
              <Flex
                as={Link}
                to={item.path}
                position="relative"
                align="baseline"
                gap={4}
                py={3}
                role="group"
                color={active ? 'ink.500' : 'gray.400'}
                transition="color .25s ease, transform .25s ease"
                _hover={{ color: 'ink.500', transform: 'translateX(4px)' }}
              >
                {active && (
                  <MotionBox
                    layoutId="nav-marker"
                    position="absolute"
                    left="-18px"
                    top="50%"
                    mt="-3px"
                    w="6px"
                    h="6px"
                    borderRadius="full"
                    bg="brand.500"
                    boxShadow="0 0 14px 2px rgba(227,99,63,.6)"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Text fontFamily="mono" fontSize="10px" letterSpacing="0.12em" color={active ? 'brand.500' : 'gray.500'}>
                  {item.no}
                </Text>
                <Text fontFamily="heading" fontSize="22px" fontWeight={300} letterSpacing="-0.02em">
                  {item.name}
                </Text>
              </Flex>
            </Reveal>
          );
        })}
      </VStack>

      <Box mt={12}>
        <Text textStyle="eyebrow" mb={3}>
          Agents
        </Text>
        <VStack spacing={1} align="stretch">
          {agents.map((agent) => (
            <Flex
              key={agent.id}
              align="center"
              gap={3}
              py={1.5}
              cursor="pointer"
              color="gray.300"
              transition="color .2s ease"
              _hover={{ color: 'ink.500' }}
              onClick={() => navigate('/agent-config')}
            >
              <Box w="5px" h="5px" borderRadius="full" bg={agent.status === 'active' ? 'rose.500' : 'gray.600'} />
              <Text fontSize="13px" noOfLines={1}>
                {agent.name}
              </Text>
            </Flex>
          ))}
        </VStack>
      </Box>

      <Box mt="auto" pt={8} borderTop="1px solid rgba(232,226,216,.08)">
        <Flex align="center" gap={3}>
          <LiveDot live={isConnected} />
          <Text fontFamily="mono" fontSize="10px" letterSpacing="0.14em" textTransform="uppercase" color="gray.300">
            {isConnected ? 'Live' : 'Reconnecting'}
          </Text>
        </Flex>
        <Text fontFamily="mono" fontSize="10px" letterSpacing="0.08em" color="gray.500" mt={2}>
          supervisor-001{inControl ? ` · ${inControl} in control` : ''}
        </Text>
      </Box>
    </Flex>
  );
};

export default Sidebar;
