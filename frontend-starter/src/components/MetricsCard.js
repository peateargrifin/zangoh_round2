// src/components/MetricsCard.js
// One figure, set large in the display serif. `tone`: 'ink' (neutral), 'rose' (calm) or 'brand' (persimmon, urgent).
import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { CountUp, GlassPanel } from './motion';

const toneColor = { ink: 'ink.500', rose: 'rose.500', brand: 'brand.500' };

const MetricsCard = ({ title, value, decimals = 0, suffix = '', tone = 'ink', hint }) => (
  <GlassPanel p={5} overflow="hidden">
    <Flex align="center" gap={2} mb={5}>
      <Box w="5px" h="5px" borderRadius="full" bg={toneColor[tone]} />
      <Text textStyle="eyebrow" noOfLines={1}>
        {title}
      </Text>
    </Flex>
    <Text
      textStyle="display"
      fontSize="52px"
      color={tone === 'brand' && Number(value) > 0 ? 'brand.500' : 'ink.500'}
      sx={{ fontFeatureSettings: '"lnum"' }}
    >
      {typeof value === 'number' ? <CountUp value={value} decimals={decimals} suffix={suffix} /> : value}
    </Text>
    {hint && (
      <Text fontFamily="mono" fontSize="10px" letterSpacing="0.08em" color="gray.500" mt={2}>
        {hint}
      </Text>
    )}
  </GlassPanel>
);

export default MetricsCard;
