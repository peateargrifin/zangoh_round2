// src/components/ConversationList.js
// A ledger rather than a stack of cards: hairline rows on one glass sheet. Rows re-order with a spring
// when severity changes and drop in when a new conversation arrives.
import React, { useMemo, useState } from 'react';
import { Box, Flex, Input, InputGroup, InputLeftElement, Select, Text } from '@chakra-ui/react';
import { AnimatePresence } from 'framer-motion';
import { FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { timeAgo } from '../utils/dateUtils';
import { useAppData } from '../context/AppDataContext';
import { GlassPanel, LiveDot, MotionBox } from './motion';

const alertRank = { high: 0, medium: 1, low: 2 };
const statusTone = { active: 'gray.300', waiting: 'orange.500', resolved: 'rose.500', escalated: 'brand.500' };

const Meta = ({ children, ...props }) => (
  <Text fontFamily="mono" fontSize="10px" letterSpacing="0.1em" textTransform="uppercase" color="gray.400" {...props}>
    {children}
  </Text>
);

const ConversationList = ({ conversations, loading, error }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const { agents } = useAppData();
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return conversations
      .filter((conv) => {
        const matchesSearch =
          term === '' ||
          conv.customer?.name?.toLowerCase().includes(term) ||
          (conv.tags && conv.tags.some((tag) => tag.toLowerCase().includes(term)));
        return (
          matchesSearch &&
          (statusFilter === 'all' || conv.status === statusFilter) &&
          (alertFilter === 'all' || conv.alertLevel === alertFilter) &&
          (agentFilter === 'all' || conv.agent?.id === agentFilter)
        );
      })
      // resolved last, then most severe alert first, then newest
      .sort(
        (a, b) =>
          (a.status === 'resolved') - (b.status === 'resolved') ||
          alertRank[a.alertLevel] - alertRank[b.alertLevel] ||
          new Date(b.startTime) - new Date(a.startTime)
      );
  }, [conversations, searchTerm, statusFilter, alertFilter, agentFilter]);

  if (loading) {
    return (
      <GlassPanel hoverable={false} p={8}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            h="54px"
            mb={3}
            borderRadius="md"
            bg="linear-gradient(90deg, rgba(232,226,216,.03) 30%, rgba(232,226,216,.09) 50%, rgba(232,226,216,.03) 70%)"
            backgroundSize="200% 100%"
            animation="shimmer 2.2s linear infinite"
          />
        ))}
      </GlassPanel>
    );
  }
  if (error) {
    return (
      <GlassPanel hoverable={false} p={6}>
        <Text color="red.500">Could not load conversations: {error}</Text>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel hoverable={false} overflow="hidden">
      <Flex p={5} gap={3} wrap="wrap" borderBottom="1px solid rgba(232,226,216,.08)">
        <InputGroup flex="2" minW="220px" size="sm">
          <InputLeftElement pointerEvents="none" color="gray.400">
            <FiSearch />
          </InputLeftElement>
          <Input placeholder="Search by customer or tag" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </InputGroup>
        <Select size="sm" flex="1" minW="130px" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="waiting">Waiting</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </Select>
        <Select size="sm" flex="1" minW="130px" value={alertFilter} onChange={(e) => setAlertFilter(e.target.value)} aria-label="Filter by alert level">
          <option value="all">All alert levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
        <Select size="sm" flex="1" minW="130px" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} aria-label="Filter by agent">
          <option value="all">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Flex>

      <Box maxH="640px" overflowY="auto">
        {filtered.length === 0 && (
          <Box p={10} textAlign="center" color="gray.400" fontFamily="heading" fontStyle="italic" fontSize="xl">
            Nothing matches those filters.
          </Box>
        )}
        <AnimatePresence initial={false}>
          {filtered.map((conv) => {
            const count = conv.messageCount ?? conv.messages?.length ?? 0;
            const human = conv.humanIntervention?.active;
            return (
              <MotionBox
                key={conv.id}
                layout
                initial={{ opacity: 0, y: -18, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                position="relative"
                px={6}
                py={4}
                borderBottom="1px solid rgba(232,226,216,.07)"
                cursor="pointer"
                onClick={() => navigate(`/conversation/${conv.id}`)}
                role="group"
                bg={human ? 'rgba(227,99,63,.06)' : 'transparent'}
                _hover={{ bg: human ? 'rgba(227,99,63,.09)' : 'rgba(232,226,216,.05)' }}
              >
                <Box
                  position="absolute"
                  left={0}
                  top={0}
                  bottom={0}
                  w="2px"
                  bg="brand.500"
                  opacity={conv.alertLevel === 'high' || human ? 1 : 0}
                  transition="opacity .3s ease"
                />
                <Flex align="baseline" justify="space-between" gap={4}>
                  <Flex align="baseline" gap={4} minW={0}>
                    <Text
                      fontFamily="heading"
                      fontSize="22px"
                      fontWeight={400}
                      letterSpacing="-0.015em"
                      noOfLines={1}
                      transition="transform .25s ease"
                      _groupHover={{ transform: 'translateX(4px)' }}
                    >
                      {conv.customer?.name}
                    </Text>
                    <Meta color={statusTone[conv.status]}>{conv.status}</Meta>
                    {human && <Meta color="brand.500">· human in control</Meta>}
                  </Flex>
                  <Flex align="center" gap={4} flexShrink={0}>
                    {conv.hasNewMessage && <Meta color="rose.500">new</Meta>}
                    {conv.alertLevel === 'high' && <LiveDot size={8} />}
                    {conv.alertLevel === 'medium' && <Box w="8px" h="8px" borderRadius="full" border="1px solid" borderColor="orange.500" />}
                  </Flex>
                </Flex>

                <Flex align="center" gap={4} mt={1} wrap="wrap">
                  <Meta>{count} msgs</Meta>
                  <Meta>{timeAgo(new Date(conv.startTime))}</Meta>
                  <Meta>{conv.agent?.name}</Meta>
                  {(conv.tags || []).slice(0, 4).map((tag) => (
                    <Meta key={tag} color="rose.500" textTransform="none" letterSpacing="0.04em">
                      #{tag}
                    </Meta>
                  ))}
                </Flex>

                {conv.lastMessage && (
                  <Text fontSize="sm" color="gray.300" mt={2} noOfLines={1}>
                    <Text as="span" fontFamily="mono" fontSize="10px" letterSpacing="0.1em" textTransform="uppercase" color="gray.500" mr={2}>
                      {conv.lastMessage.sender}
                    </Text>
                    {conv.lastMessage.text}
                  </Text>
                )}
              </MotionBox>
            );
          })}
        </AnimatePresence>
      </Box>
    </GlassPanel>
  );
};

export default ConversationList;
