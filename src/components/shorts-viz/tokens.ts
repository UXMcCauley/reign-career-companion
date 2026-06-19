export const SHORTS_VIZ_COLORS = {
  green: 'var(--app-brand-light-green)',
  darkGreen: 'var(--app-brand-dark-green)',
  purple: '#7B3FFF',
  lavender: '#A78BFA',
  gold: '#E8B84A',
  amber: '#FFAB3A',
  pink: 'var(--app-brand-light-pink)',
  blue: 'var(--app-brand-light-blue)',
  white: '#F8FBFF',
  muted: 'rgba(212, 223, 245, 0.72)'
} as const;

export type ShortsVizAccent = keyof typeof SHORTS_VIZ_COLORS;
