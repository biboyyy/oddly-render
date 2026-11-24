import layout from './layout.json';

// ODDLY visual identity + layout safe-zones (1080 x 1920).
export const COLORS = {
  navy: '#101B32',
  blue: '#2865A5',
  lightBlue: '#7FC8FF',
  yellow: '#FFD447',
  white: '#FFFFFF',
  red: '#FF5A5F',
  skin: '#F6CFAE',
};

export const FONT = 'Montserrat, system-ui, sans-serif';

// Layout boxes are used by components AND by the QC overlap check.
export const LAYOUT = layout;

export const rectsOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
