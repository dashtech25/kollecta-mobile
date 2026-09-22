export const COLORS = {
  primary: '#cb1011',
  primaryDark: '#a00d0e',
  primaryLight: '#e8434a',
  white: '#ffffff',
  black: '#000000',
  darkGray: '#32373c',
  gray: '#6b7280',
  lightGray: '#f5f5f5',
  border: '#e5e7eb',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#ffffff',
  card: '#f5f5f5',
  text: '#32373c',
  textSecondary: '#6b7280',
} as const;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BORDER_RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  full: 9999,
} as const;

// ──────────────────────────────────────────────────────────────
// NEUTRAL DESIGN SYSTEM
// Used by the refonted collector portal. Warm cream + charcoal,
// no colored icons or text. Status conveyed via weight & shape.
// ──────────────────────────────────────────────────────────────
export const NEUTRAL = {
  // Backgrounds
  bg: '#F5F1E9',          // warm cream — main app background
  surface: '#FFFFFF',     // primary surfaces (cards, sheets)
  surfaceAlt: '#FBF7EE',  // alternative tinted surface
  surfaceSunken: '#EFEAE0', // pressed / sunken state, segmented bg

  // Borders & dividers
  border: '#E5DFD2',       // standard hairline
  borderSoft: '#EFEAE0',   // very light divider
  borderStrong: '#1A1A1A', // for emphasized outlines

  // Text (ink)
  ink: '#1A1817',          // primary text & icons
  inkMid: '#5A5651',       // secondary
  inkSoft: '#8A857D',      // tertiary / placeholder
  inkOnFill: '#FFFFFF',    // text/icon on dark fills

  // Action / fills
  fill: '#1A1817',         // primary CTA background
  fillPressed: '#2A2724',
  fillMuted: '#322E29',
} as const;

