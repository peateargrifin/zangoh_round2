// src/components/TemplatePreview.js
// Renders template content with {{variables}} clearly marked:
//   - unfilled placeholders: marker-yellow chip showing {{name}}
//   - filled placeholders: green chip showing the substituted value
import React from 'react';
import { Box, Tooltip } from '@chakra-ui/react';
import { toSegments } from '../utils/templates';

const TemplatePreview = ({ content, values = {}, descriptions = {}, ...boxProps }) => (
  <Box whiteSpace="pre-wrap" fontSize="sm" lineHeight="1.7" {...boxProps}>
    {toSegments(content, values).map((seg, i) =>
      seg.type === 'text' ? (
        <React.Fragment key={i}>{seg.text}</React.Fragment>
      ) : (
        <Tooltip
          key={i}
          label={descriptions[seg.name] || seg.name}
          hasArrow
          placement="top"
        >
          <Box
            as="span"
            px={1.5}
            py={0.5}
            mx={0.5}
            borderRadius="sm"
            fontWeight={seg.filled ? 500 : 400}
            bg={seg.filled ? 'rgba(201,143,139,.18)' : 'rgba(231,210,124,.16)'}
            color={seg.filled ? 'rose.300' : 'yellow.500'}
            borderBottom="1px dashed"
            borderColor={seg.filled ? 'rgba(201,143,139,.5)' : 'rgba(231,210,124,.6)'}
            fontFamily={seg.filled ? 'inherit' : 'mono'}
            fontSize={seg.filled ? 'inherit' : '0.92em'}
            transition="background .3s ease, color .3s ease"
          >
            {seg.text}
          </Box>
        </Tooltip>
      )
    )}
  </Box>
);

export default TemplatePreview;
