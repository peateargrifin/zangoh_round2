// src/theme.js
// Palette 04 - Midnight + Dusty Rose + Persimmon.
// Ground carries the page, ink carries the words, and the accent only shows up where something is
// actually happening: persimmon = urgent / a human is intervening, dusty rose = calm, resolved, atmosphere.
import { extendTheme } from '@chakra-ui/react';

export const GROUND = '#171922';
export const INK = '#E8E2D8';
export const ROSE = '#C98F8B';
export const PERSIMMON = '#E3633F';

const grain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Chakra's dark mode reads shade 200 for solid buttons / badge text / switches, so the hero tone lives at 200 (and 500).
const scale = (hero, shades) => ({ ...shades, 200: hero, 500: hero });

const theme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  colors: {
    black: GROUND,
    white: '#F4EFE6',
    // dark surfaces: 900 = ground, 700/800 = raised
    gray: {
      50: '#F3EFE7',
      100: '#E8E2D8',
      200: '#D0CBCF',
      300: '#B1B3C0',
      400: '#8E92A5',
      500: '#666B82',
      600: '#474C63',
      700: '#2C3042',
      800: '#212433',
      900: GROUND,
    },
    ink: scale(INK, { 50: '#F8F5EF', 100: '#F0EBE2', 300: '#D6CFC2', 400: '#B9B2A4', 600: '#CFC8BA', 700: '#B6AE9F', 800: '#8F887B', 900: '#5F5A50' }),
    brand: scale(PERSIMMON, { 50: '#FBE4DB', 100: '#F6CBBB', 300: '#EC7A58', 400: '#F08F70', 600: '#C24E2E', 700: '#9B3D23', 800: '#6E2B18', 900: '#48190E' }),
    rose: scale(ROSE, { 50: '#F7ECEB', 100: '#EED8D6', 300: '#D9A9A5', 400: '#D19C98', 600: '#A97572', 700: '#835856', 800: '#5C3D3C', 900: '#3A2727' }),
    // legacy scheme names used across the app, remapped into the palette
    green: scale(ROSE, { 50: '#F7ECEB', 100: '#EED8D6', 300: '#D9A9A5', 400: '#D19C98', 600: '#A97572', 700: '#835856', 800: '#5C3D3C', 900: '#3A2727' }),
    teal: scale(ROSE, { 50: '#F7ECEB', 100: '#EED8D6', 300: '#D9A9A5', 400: '#D19C98', 600: '#A97572', 700: '#835856', 800: '#5C3D3C', 900: '#3A2727' }),
    blue: scale(INK, { 50: '#F8F5EF', 100: '#F0EBE2', 300: '#D6CFC2', 400: '#B9B2A4', 600: '#CFC8BA', 700: '#B6AE9F', 800: '#8F887B', 900: '#5F5A50' }),
    red: scale('#EE7358', { 50: '#FCE7E1', 100: '#F8CCC1', 300: '#F18A72', 400: '#F27D63', 600: '#CF5238', 700: '#A63F29', 800: '#7A2D1D', 900: '#4E1C12' }),
    orange: scale('#D9A27A', { 50: '#FAEFE6', 100: '#F1DAC6', 300: '#E0B08D', 400: '#DDA983', 600: '#B58259', 700: '#8D6443', 800: '#65462F', 900: '#412D1F' }),
    yellow: scale('#E7D27C', { 50: '#FBF6DF', 100: '#F4EAB6', 300: '#ECD98F', 400: '#EAD585', 600: '#C3AE5C', 700: '#95843F', 800: '#6A5D2C', 900: '#463D1D' }),
  },
  fonts: {
    heading: `'Fraunces', 'Iowan Old Style', Georgia, serif`,
    body: `'Hanken Grotesk', 'Helvetica Neue', system-ui, sans-serif`,
    mono: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`,
  },
  radii: { sm: '3px', md: '6px', lg: '10px', xl: '14px', '2xl': '18px' },
  // almost no shadow: the absence is what reads as glass / paper rather than a floating card
  shadows: {
    sm: 'inset 0 1px 0 rgba(255,255,255,.05)',
    md: 'inset 0 1px 0 rgba(255,255,255,.06)',
    lg: '0 24px 60px -24px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)',
    xl: '0 24px 60px -24px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)',
    outline: `0 0 0 2px rgba(201,143,139,.45)`,
  },
  layerStyles: {
    // frosted paper over the atmosphere: rgba ground, hairline border, almost no shadow
    glass: {
      bg: 'rgba(232,226,216,.045)',
      border: '1px solid rgba(232,226,216,.10)',
      backdropFilter: 'blur(18px) saturate(115%)',
      borderRadius: 'xl',
      boxShadow: 'sm',
    },
    // a recessed well inside a glass panel
    glassInset: {
      bg: 'rgba(23,25,34,.45)',
      border: '1px solid rgba(232,226,216,.08)',
      borderRadius: 'lg',
    },
    // children drop in one after another
    stagger: {
      '& > *': { animation: 'drop .75s cubic-bezier(.22,1,.36,1) both' },
      '& > *:nth-of-type(2)': { animationDelay: '.06s' },
      '& > *:nth-of-type(3)': { animationDelay: '.12s' },
      '& > *:nth-of-type(4)': { animationDelay: '.18s' },
      '& > *:nth-of-type(5)': { animationDelay: '.24s' },
      '& > *:nth-of-type(6)': { animationDelay: '.30s' },
      '& > *:nth-of-type(7)': { animationDelay: '.36s' },
      '& > *:nth-of-type(8)': { animationDelay: '.42s' },
      '& > *:nth-of-type(n+9)': { animationDelay: '.48s' },
    },
    // frosted dark glass: single overlays only (modals, menus)
    darkGlass: {
      bg: 'rgba(23,25,34,.72)',
      border: '1px solid rgba(255,255,255,.10)',
      backdropFilter: 'blur(22px) saturate(115%)',
      borderRadius: 'xl',
      boxShadow: 'lg',
    },
  },
  textStyles: {
    eyebrow: { fontFamily: 'mono', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'gray.400' },
    display: { fontFamily: 'heading', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.02, fontVariationSettings: '"opsz" 144' },
  },
  styles: {
    global: {
      'html, body': { background: GROUND, color: INK, fontFamily: 'body', fontWeight: 400, WebkitFontSmoothing: 'antialiased' },
      '::selection': { background: 'rgba(227,99,63,.38)', color: '#fff' },
      // grain keeps every gradient from banding
      'body::after': {
        content: '""',
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.05,
        backgroundImage: grain,
        mixBlendMode: 'overlay',
        zIndex: 9999,
      },
      '::-webkit-scrollbar': { width: '8px', height: '8px' },
      '::-webkit-scrollbar-thumb': { background: 'rgba(232,226,216,.16)', borderRadius: '8px' },
      '::-webkit-scrollbar-track': { background: 'transparent' },
      'select option': { background: '#212433', color: INK },
      code: { fontFamily: 'mono', fontSize: '0.9em', color: ROSE },

      '@keyframes drift-a': {
        '0%': { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)' },
        '50%': { transform: 'translate3d(-5vw,4vh,0) rotate(24deg) scale(1.14)' },
        '100%': { transform: 'translate3d(3vw,-3vh,0) rotate(-12deg) scale(1.04)' },
      },
      '@keyframes drift-b': {
        '0%': { transform: 'translate3d(0,0,0) rotate(0deg) scale(1.05)' },
        '50%': { transform: 'translate3d(6vw,-5vh,0) rotate(-30deg) scale(1.2)' },
        '100%': { transform: 'translate3d(-2vw,3vh,0) rotate(14deg) scale(1)' },
      },
      '@keyframes ember': {
        '0%, 100%': { opacity: 0.55, transform: 'scale(1)' },
        '50%': { opacity: 0.95, transform: 'scale(1.18)' },
      },
      '@keyframes ping': {
        '0%': { transform: 'scale(1)', opacity: 0.7 },
        '80%, 100%': { transform: 'scale(2.6)', opacity: 0 },
      },
      '@keyframes intervene': {
        '0%, 100%': { boxShadow: '0 0 0 1px rgba(227,99,63,.55), 0 0 32px -6px rgba(227,99,63,.35)' },
        '50%': { boxShadow: '0 0 0 1px rgba(227,99,63,.9), 0 0 54px -4px rgba(227,99,63,.55)' },
      },
      '@keyframes shimmer': {
        '0%': { backgroundPosition: '-200% 0' },
        '100%': { backgroundPosition: '200% 0' },
      },
      '@keyframes drop': {
        '0%': { opacity: 0, transform: 'translateY(-16px) scale(.98)', filter: 'blur(6px)' },
        '100%': { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
      },
      '@media (prefers-reduced-motion: reduce)': {
        '*, *::before, *::after': { animation: 'none !important', transition: 'none !important' },
      },
    },
  },
  components: {
    Heading: { baseStyle: { fontFamily: 'heading', fontWeight: 400, letterSpacing: '-0.015em' } },
    Text: { baseStyle: { color: 'inherit' } },
    Button: {
      baseStyle: {
        fontFamily: 'mono',
        fontWeight: 500,
        fontSize: '12px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: 'md',
        transition: 'transform .18s ease, background .2s ease, border-color .2s ease, box-shadow .25s ease',
        _active: { transform: 'scale(.97)' },
      },
      variants: {
        solid: (props) => {
          const c = props.colorScheme;
          return {
            bg: `${c}.500`,
            color: GROUND,
            _hover: { bg: `${c}.300`, transform: 'translateY(-1px)', boxShadow: `0 8px 24px -10px var(--chakra-colors-${c}-500)`, _disabled: { bg: `${c}.500`, transform: 'none' } },
            _disabled: { opacity: 0.35 },
          };
        },
        outline: (props) => {
          const c = props.colorScheme;
          return {
            border: '1px solid',
            borderColor: 'rgba(232,226,216,.22)',
            color: c === 'ink' ? INK : `${c}.500`,
            bg: 'rgba(232,226,216,.03)',
            backdropFilter: 'blur(10px)',
            _hover: { borderColor: `${c}.500`, bg: 'rgba(232,226,216,.07)', transform: 'translateY(-1px)', _disabled: { transform: 'none', bg: 'rgba(232,226,216,.03)' } },
          };
        },
        ghost: (props) => ({
          color: props.colorScheme === 'ink' ? INK : `${props.colorScheme}.500`,
          _hover: { bg: 'rgba(232,226,216,.07)' },
        }),
      },
      defaultProps: { colorScheme: 'ink' },
    },
    IconButton: { baseStyle: { fontFamily: 'body' } },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'rgba(232,226,216,.04)',
            border: '1px solid rgba(232,226,216,.14)',
            borderRadius: 'md',
            color: INK,
            _placeholder: { color: 'gray.500' },
            _hover: { borderColor: 'rgba(232,226,216,.3)' },
            _focusVisible: { borderColor: ROSE, boxShadow: '0 0 0 3px rgba(201,143,139,.18)', bg: 'rgba(232,226,216,.06)' },
          },
        },
      },
    },
    Textarea: {
      variants: {
        outline: {
          bg: 'rgba(232,226,216,.04)',
          border: '1px solid rgba(232,226,216,.14)',
          borderRadius: 'md',
          _placeholder: { color: 'gray.500' },
          _hover: { borderColor: 'rgba(232,226,216,.3)' },
          _focusVisible: { borderColor: ROSE, boxShadow: '0 0 0 3px rgba(201,143,139,.18)', bg: 'rgba(232,226,216,.06)' },
        },
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            bg: 'rgba(232,226,216,.04)',
            border: '1px solid rgba(232,226,216,.14)',
            _hover: { borderColor: 'rgba(232,226,216,.3)' },
            _focusVisible: { borderColor: ROSE, boxShadow: '0 0 0 3px rgba(201,143,139,.18)' },
          },
        },
      },
    },
    NumberInput: {
      variants: {
        outline: {
          field: {
            bg: 'rgba(232,226,216,.04)',
            border: '1px solid rgba(232,226,216,.14)',
            _focusVisible: { borderColor: ROSE, boxShadow: '0 0 0 3px rgba(201,143,139,.18)' },
          },
        },
      },
    },
    FormLabel: { baseStyle: { fontFamily: 'mono', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'gray.400', fontWeight: 500 } },
    Badge: {
      baseStyle: { fontFamily: 'mono', fontWeight: 500, letterSpacing: '0.1em', fontSize: '10px', borderRadius: 'sm', px: 2, py: '2px' },
    },
    Tag: { baseStyle: { container: { fontFamily: 'mono', fontSize: '11px', borderRadius: 'sm' } } },
    Tabs: {
      variants: {
        editorial: {
          tablist: { borderBottom: '1px solid rgba(232,226,216,.10)', gap: 6 },
          tab: {
            fontFamily: 'mono',
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'gray.400',
            px: 0,
            pb: 3,
            mb: '-1px',
            borderBottom: '1px solid transparent',
            transition: 'color .2s ease, border-color .2s ease',
            _hover: { color: INK },
            _selected: { color: INK, borderBottomColor: PERSIMMON },
          },
        },
      },
      defaultProps: { variant: 'editorial' },
    },
    Switch: {
      baseStyle: {
        track: { bg: 'rgba(232,226,216,.14)', _checked: { bg: ROSE }, transition: 'background .25s ease' },
        thumb: { bg: INK },
      },
    },
    Slider: {
      baseStyle: {
        track: { bg: 'rgba(232,226,216,.14)', h: '2px' },
        filledTrack: { bg: ROSE },
        thumb: { bg: INK, boxSize: '14px', boxShadow: `0 0 0 4px rgba(201,143,139,.22)`, _focusVisible: { boxShadow: `0 0 0 6px rgba(201,143,139,.3)` } },
      },
    },
    Progress: { baseStyle: { track: { bg: 'rgba(232,226,216,.10)' } } },
    Alert: {
      variants: {
        subtle: (props) => ({
          container: { bg: 'rgba(232,226,216,.05)', border: '1px solid rgba(232,226,216,.12)', backdropFilter: 'blur(18px) saturate(115%)', color: INK },
          icon: { color: `${props.colorScheme}.500` },
        }),
      },
    },
    Modal: {
      baseStyle: {
        overlay: { bg: 'rgba(11,12,18,.55)', backdropFilter: 'blur(8px) saturate(110%)' },
        dialog: {
          bg: 'rgba(23,25,34,.78)',
          border: '1px solid rgba(255,255,255,.10)',
          backdropFilter: 'blur(22px) saturate(115%)',
          borderRadius: 'xl',
          boxShadow: 'lg',
        },
        header: { fontFamily: 'heading', fontWeight: 400, fontSize: '2xl', letterSpacing: '-0.01em' },
      },
    },
    AlertDialog: {
      baseStyle: {
        dialog: { bg: 'rgba(23,25,34,.78)', border: '1px solid rgba(255,255,255,.10)', backdropFilter: 'blur(22px) saturate(115%)', borderRadius: 'xl' },
      },
    },
    Menu: {
      baseStyle: {
        list: { bg: 'rgba(23,25,34,.78)', border: '1px solid rgba(255,255,255,.10)', backdropFilter: 'blur(22px) saturate(115%)', borderRadius: 'lg', boxShadow: 'lg', py: 1 },
        item: { bg: 'transparent', fontSize: 'sm', _hover: { bg: 'rgba(232,226,216,.07)' }, _focus: { bg: 'rgba(232,226,216,.07)' } },
      },
    },
    Tooltip: { baseStyle: { bg: 'rgba(23,25,34,.92)', color: INK, border: '1px solid rgba(255,255,255,.10)', borderRadius: 'md', fontSize: 'xs', px: 3, py: 2 } },
  },
});

export default theme;
