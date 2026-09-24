// src/pages/Analysis.js - trends, common issues and agent comparison from live analytics
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, AlertIcon, Box, Button, Flex, Heading, SimpleGrid, Spinner, Text } from '@chakra-ui/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAnalyticsOverview } from '../api';
import { GlassPanel } from '../components/motion';

const AXIS = { tick: { fill: '#8E92A5', fontSize: 11 }, stroke: 'rgba(232,226,216,.14)', tickLine: false };
const GRID = { stroke: 'rgba(232,226,216,.07)', vertical: false };
const TIP = {
  contentStyle: { background: 'rgba(23,25,34,.92)', border: '1px solid rgba(232,226,216,.14)', borderRadius: 8, color: '#E8E2D8', fontSize: 12 },
  cursor: { fill: 'rgba(232,226,216,.04)' },
};
const LEGEND = { wrapperStyle: { color: '#B1B3C0', fontSize: 12 } };

const Panel = ({ title, children, empty }) => (
  <GlassPanel p={6}>
    <Heading as="h3" fontSize="xl" mb={5}>
      {title}
    </Heading>
    {empty ? (
      <Text color="gray.400" fontSize="sm">
        Not enough data for this range yet.
      </Text>
    ) : (
      <Box h="240px">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </Box>
    )}
  </GlassPanel>
);

const Analysis = () => {
  const [range, setRange] = useState('month');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    getAnalyticsOverview(range)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [range]);

  const issues = useMemo(() => {
    if (!data) return [];
    const totals = {};
    data.agents.forEach((a) => (a.metrics?.topIssues || []).forEach((i) => (totals[i.name] = (totals[i.name] || 0) + i.count)));
    return Object.entries(totals)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [data]);

  const agentRows = useMemo(
    () =>
      (data?.agents || []).map((a) => ({
        name: a.name,
        satisfaction: Math.round((a.metrics?.satisfaction || 0) * 100),
        escalation: Math.round((a.metrics?.escalationRate || 0) * 100),
      })),
    [data]
  );

  const trendRows = useMemo(() => {
    if (!data) return [];
    const byDate = {};
    const add = (key, list, field) =>
      list.forEach((p) => {
        byDate[p.date] = { ...(byDate[p.date] || { date: p.date.slice(5) }), [key]: p[field] };
      });
    add('conversations', data.trends.conversations, 'count');
    add('responseTime', data.trends.responseTime, 'value');
    add('sentiment', data.trends.sentiment, 'value');
    return Object.keys(byDate)
      .sort()
      .map((k) => byDate[k]);
  }, [data]);

  return (
    <Box>
      <Flex justify="space-between" align="flex-end" mb={10} wrap="wrap" gap={3}>
        <Box>
          <Text textStyle="eyebrow" mb={4}>
            Performance across conversations and agents
          </Text>
          <Heading as="h1" textStyle="display" fontSize={{ base: '44px', md: '64px' }}>
            The{' '}
            <Box as="span" fontStyle="italic" color="rose.500">
              pattern
            </Box>
            .
          </Heading>
        </Box>
        <Flex gap={6}>
          {[['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([k, label]) => (
            <Box
              key={k}
              as="button"
              onClick={() => setRange(k)}
              pb={2}
              fontFamily="mono"
              fontSize="11px"
              letterSpacing="0.14em"
              textTransform="uppercase"
              color={range === k ? 'ink.500' : 'gray.400'}
              borderBottom="1px solid"
              borderColor={range === k ? 'brand.500' : 'transparent'}
              transition="color .2s ease, border-color .2s ease"
              _hover={{ color: 'ink.500' }}
            >
              {label}
            </Box>
          ))}
        </Flex>
      </Flex>

      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      {!data && !error && <Spinner />}

      {data && (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} layerStyle="stagger">
          <Panel title="Conversation volume" empty={trendRows.length === 0}>
            <BarChart data={trendRows}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="date" {...AXIS} />
              <YAxis allowDecimals={false} {...AXIS} />
              <Tooltip {...TIP} />
              <Bar dataKey="conversations" name="Conversations" fill="#C98F8B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </Panel>

          <Panel title="Response time (s) and sentiment" empty={trendRows.length === 0}>
            <LineChart data={trendRows}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="date" {...AXIS} />
              <YAxis yAxisId="left" {...AXIS} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 1]} {...AXIS} />
              <Tooltip {...TIP} />
              <Legend {...LEGEND} />
              <Line yAxisId="left" type="monotone" dataKey="responseTime" name="Response time" stroke="#E3633F" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="sentiment" name="Sentiment" stroke="#E8E2D8" strokeWidth={2} dot={false} />
            </LineChart>
          </Panel>

          <Panel title="Most common issues" empty={issues.length === 0}>
            <BarChart data={issues} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid {...GRID} />
              <XAxis type="number" {...AXIS} />
              <YAxis type="category" dataKey="name" width={130} {...AXIS} />
              <Tooltip {...TIP} />
              <Bar dataKey="count" name="Conversations" fill="#E3633F" radius={[0, 3, 3, 0]} />
            </BarChart>
          </Panel>

          <Panel title="Agent comparison (%)" empty={agentRows.length === 0}>
            <BarChart data={agentRows}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="name" {...AXIS} />
              <YAxis domain={[0, 100]} {...AXIS} />
              <Tooltip {...TIP} />
              <Legend {...LEGEND} />
              <Bar dataKey="satisfaction" name="Satisfaction" fill="#C98F8B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="escalation" name="Escalation rate" fill="#E3633F" radius={[3, 3, 0, 0]} />
            </BarChart>
          </Panel>
        </SimpleGrid>
      )}
    </Box>
  );
};

export default Analysis;
