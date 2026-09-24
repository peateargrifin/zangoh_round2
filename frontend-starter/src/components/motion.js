// src/components/motion.js
// Motion + glass primitives shared by every screen.
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { Box, chakra, shouldForwardProp } from '@chakra-ui/react';
import { animate, isValidMotionProp, motion, useInView, useReducedMotion } from 'framer-motion';

export const MotionBox = chakra(motion.div, {
  shouldForwardProp: (prop) => isValidMotionProp(prop) || shouldForwardProp(prop),
});

const EASE = [0.22, 1, 0.36, 1];

/** Drops its children in: fades up from slightly above, blur to sharp. Stagger with `index`. */
export const Reveal = ({ index = 0, delay = 0, y = -14, children, ...props }) => {
  const reduce = useReducedMotion();
  return (
    <MotionBox
      initial={reduce ? false : { opacity: 0, y, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, delay: delay + index * 0.07, ease: EASE }}
      {...props}
    >
      {children}
    </MotionBox>
  );
};

/** A number that counts up to `value` (and re-counts smoothly when it changes). */
export const CountUp = ({ value, decimals = 0, suffix = '', prefix = '', duration = 1.1 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const from = useRef(0);
  const [text, setText] = useState(reduce ? value : 0);

  useEffect(() => {
    if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
    if (reduce) {
      setText(value);
      return undefined;
    }
    if (!inView) return undefined;
    const controls = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setText(v),
      onComplete: () => {
        from.current = value;
      },
    });
    return () => {
      from.current = value;
      controls.stop();
    };
  }, [value, inView, duration, reduce]);

  const shown = typeof value !== 'number' || Number.isNaN(value) ? value : Number(text).toFixed(decimals);
  return (
    <span ref={ref}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
};

/**
 * Frosted-glass panel. A soft light follows the cursor across the surface.
 * `intervene` adds the pulsing persimmon edge used when a human is in control.
 */
export const GlassPanel = forwardRef(({ children, hoverable = true, intervene = false, onMouseMove, ...props }, ref) => {
  const handleMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
    if (onMouseMove) onMouseMove(e);
  };
  return (
    <Box
      ref={ref}
      layerStyle="glass"
      position="relative"
      onMouseMove={hoverable ? handleMove : onMouseMove}
      transition="border-color .3s ease, background .3s ease"
      _before={
        hoverable
          ? {
              content: '""',
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              opacity: 0,
              transition: 'opacity .35s ease',
              background: 'radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), rgba(232,226,216,.09), transparent 62%)',
            }
          : undefined
      }
      _hover={hoverable ? { borderColor: 'rgba(232,226,216,.2)', _before: { opacity: 1 } } : undefined}
      animation={intervene ? 'intervene 3.2s ease-in-out infinite' : undefined}
      {...props}
    >
      {children}
    </Box>
  );
});

/**
 * Atmosphere: stacked radial gradients that run past the edge of the page - large translucent
 * dusty-rose forms drifting slowly, one persimmon ember. Gradients only (no filter: blur), so the
 * edges are soft and it prints as well as it renders.
 */
export const Atmosphere = () => (
  <Box position="fixed" inset={0} zIndex={0} pointerEvents="none" overflow="hidden" aria-hidden="true">
    <Box
      position="absolute"
      inset={0}
      bg="radial-gradient(60% 55% at 96% -10%, rgba(201,143,139,.22) 0%, rgba(201,143,139,0) 66%), radial-gradient(48% 52% at -8% 108%, rgba(201,143,139,.14) 0%, rgba(201,143,139,0) 68%), #171922"
    />
    {/* large translucent forms */}
    <Box
      position="absolute"
      top="-26vmax"
      right="-22vmax"
      w="72vmax"
      h="58vmax"
      borderRadius="50%"
      bg="radial-gradient(closest-side, rgba(201,143,139,.34), rgba(201,143,139,.10) 55%, rgba(201,143,139,0))"
      animation="drift-a 38s ease-in-out infinite alternate"
      willChange="transform"
    />
    <Box
      position="absolute"
      bottom="-30vmax"
      left="-24vmax"
      w="64vmax"
      h="52vmax"
      borderRadius="50%"
      bg="radial-gradient(closest-side, rgba(201,143,139,.24), rgba(201,143,139,.07) 58%, rgba(201,143,139,0))"
      animation="drift-b 46s ease-in-out infinite alternate"
      willChange="transform"
    />
    {/* tiny intervention */}
    <Box
      position="absolute"
      bottom="-6vmax"
      right="8vmax"
      w="20vmax"
      h="20vmax"
      borderRadius="50%"
      bg="radial-gradient(closest-side, rgba(227,99,63,.30), rgba(227,99,63,0))"
      animation="ember 9s ease-in-out infinite"
    />
  </Box>
);

/** Small live dot: persimmon, pings when `live`. */
export const LiveDot = ({ live = true, color = 'brand.500', size = 8 }) => (
  <Box position="relative" w={`${size}px`} h={`${size}px`} display="inline-block" flexShrink={0}>
    {live && (
      <Box position="absolute" inset={0} borderRadius="full" bg={color} animation="ping 2.2s cubic-bezier(0,0,.2,1) infinite" />
    )}
    <Box position="absolute" inset={0} borderRadius="full" bg={live ? color : 'gray.500'} />
  </Box>
);
