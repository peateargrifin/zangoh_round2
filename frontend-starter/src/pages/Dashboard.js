// src/pages/Dashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Flex, Heading, SimpleGrid, Tab, TabList, TabPanel, TabPanels, Tabs, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { getAnalyticsOverview } from '../api';
import ConversationList from '../components/ConversationList';
import MetricsCard from '../components/MetricsCard';
import { CountUp, GlassPanel, LiveDot, MotionBox, Reveal } from '../components/motion';

const RANGES = [
  ['today', 'Today'],
  ['week', 'Week'],
  ['month', 'Month'],
];

const Dashboard = () => {
  const { conversations, agents, loading, error } = useAppData();
  const [timeRange, setTimeRange] = useState('week');
  const [overview, setOverview] = useState(null);
  const navigate = useNavigate();

  // Server-side aggregates for the selected range, refreshed periodically
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getAnalyticsOverview(timeRange)
        .then((data) => !cancelled && setOverview(data))
        .catch(() => {});
    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [timeRange]);

  // Live counts come from the real-time conversation list
  const open = useMemo(() => conversations.filter((c) => c.status !== 'resolved'), [conversations]);
  const highAlerts = useMemo(() => open.filter((c) => c.alertLevel === 'high'), [open]);
  const escalated = conversations.filter((c) => c.status === 'escalated').length;
  const pct = (v) => (v == null ? null : Math.round(v * 100));

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Box>
      <Reveal>
        <Flex justify="space-between" align="flex-end" wrap="wrap" gap={6} mb={10}>
          <Box>
            <Flex align="center" gap={3} mb={4}>
              <LiveDot />
              <Text textStyle="eyebrow">
                {today} · {open.length} open
              </Text>
            </Flex>
            <Heading as="h1" textStyle="display" fontSize={{ base: '46px', md: '72px' }}>
              Conversations,{' '}
              <Box as="span" fontStyle="italic" color="rose.500">
                live
              </Box>
              .
            </Heading>
            <Text color="gray.400" mt={3} maxW="46ch">
              Watch the agents work, step in when a conversation needs a human, and tune them afterwards.
            </Text>
          </Box>

          <Flex gap={6} role="tablist" aria-label="Time range">
            {RANGES.map(([key, label]) => (
              <Box
                key={key}
                as="button"
                role="tab"
                aria-selected={timeRange === key}
                onClick={() => setTimeRange(key)}
                position="relative"
                pb={2}
                fontFamily="mono"
                fontSize="11px"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color={timeRange === key ? 'ink.500' : 'gray.400'}
                transition="color .2s ease"
                _hover={{ color: 'ink.500' }}
              >
                {label}
                {timeRange === key && (
                  <MotionBox
                    layoutId="range-underline"
                    position="absolute"
                    left={0}
                    right={0}
                    bottom={0}
                    h="1px"
                    bg="brand.500"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
              </Box>
            ))}
          </Flex>
        </Flex>
      </Reveal>

      {highAlerts.length > 0 && (
        <Reveal index={1}>
          <GlassPanel hoverable={false} mb={6} px={5} py={4} borderLeft="2px solid" borderLeftColor="brand.500" borderRadius="lg">
            <Flex align="center" gap={4} wrap="wrap">
              <LiveDot />
              <Text flex="1" minW="240px">
                <Text as="span" fontFamily="heading" fontSize="xl" fontWeight={400}>
                  {highAlerts.length} {highAlerts.length > 1 ? 'conversations need' : 'conversation needs'} a human
                </Text>
                <Text as="span" color="gray.300" ml={3}>
                  {highAlerts.slice(0, 3).map((c, i) => (
                    <React.Fragment key={c.id}>
                      {i > 0 && ', '}
                      <Text
                        as="span"
                        cursor="pointer"
                        borderBottom="1px solid rgba(227,99,63,.6)"
                        _hover={{ color: 'brand.500' }}
                        onClick={() => navigate(`/conversation/${c.id}`)}
                      >
                        {c.customer?.name}
                      </Text>
                    </React.Fragment>
                  ))}
                  {highAlerts.length > 3 && ` and ${highAlerts.length - 3} more`}
                </Text>
              </Text>
            </Flex>
          </GlassPanel>
        </Reveal>
      )}

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} spacing={4} mb={12}>
        <Reveal index={2}>
          <MetricsCard title="Open" value={open.length} />
        </Reveal>
        <Reveal index={3}>
          <MetricsCard title="Resolution" value={pct(overview?.resolutionRate) ?? '–'} suffix="%" tone="rose" />
        </Reveal>
        <Reveal index={4}>
          <MetricsCard title="Response time" value={overview ? overview.avgResponseTime : '–'} decimals={1} suffix="s" />
        </Reveal>
        <Reveal index={5}>
          <MetricsCard title="Satisfaction" value={pct(overview?.avgSentiment) ?? '–'} suffix="%" tone="rose" />
        </Reveal>
        <Reveal index={6}>
          <MetricsCard title="Escalated" value={escalated} tone="brand" />
        </Reveal>
      </SimpleGrid>

      <Reveal index={7}>
        <Tabs isLazy>
          <TabList>
            <Tab>All conversations</Tab>
            <Tab>
              Needs attention
              {highAlerts.length > 0 && (
                <Box as="span" ml={2} color="brand.500">
                  {highAlerts.length}
                </Box>
              )}
            </Tab>
            <Tab>Agent performance</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0} pt={6}>
              <ConversationList conversations={conversations} loading={loading.conversations} error={error.conversations} />
            </TabPanel>

            <TabPanel px={0} pt={6}>
              <ConversationList
                conversations={conversations.filter((c) => c.alertLevel === 'high')}
                loading={loading.conversations}
                error={error.conversations}
              />
            </TabPanel>

            <TabPanel px={0} pt={6}>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
                {agents.map((agent, i) => (
                  <Reveal key={agent.id} index={i}>
                    <GlassPanel p={7}>
                      <Flex justify="space-between" align="baseline" mb={7}>
                        <Flex align="center" gap={3}>
                          <Box w="6px" h="6px" borderRadius="full" bg={agent.status === 'active' ? 'rose.500' : 'gray.600'} />
                          <Heading size="md">{agent.name}</Heading>
                        </Flex>
                        <Text fontFamily="mono" fontSize="11px" color="gray.500">
                          {agent.model}
                        </Text>
                      </Flex>
                      <SimpleGrid columns={2} spacing={7}>
                        {[
                          ['Conversations', agent.metrics?.conversations || 0, 0, ''],
                          ['Avg response', agent.metrics?.avgResponseTime || 0, 1, 's'],
                          ['Satisfaction', Math.round((agent.metrics?.satisfaction || 0) * 100), 0, '%'],
                          ['Escalation', Math.round((agent.metrics?.escalationRate || 0) * 100), 0, '%'],
                        ].map(([label, val, dec, suf]) => (
                          <Box key={label}>
                            <Text textStyle="eyebrow" mb={2}>
                              {label}
                            </Text>
                            <Text textStyle="display" fontSize="40px">
                              <CountUp value={val} decimals={dec} suffix={suf} />
                            </Text>
                          </Box>
                        ))}
                      </SimpleGrid>
                    </GlassPanel>
                  </Reveal>
                ))}
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Reveal>
    </Box>
  );
};

export default Dashboard;
