import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { OddlyLogo } from './OddlyLogo';
import { clamp } from '../utils/anim';

/** Small corner brand mark for the punchy "funfact" format. */
export const Watermark: React.FC<{ hideFrom: number }> = ({ hideFrom }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10], [0, 0.92], clamp) * interpolate(f, [hideFrom, hideFrom + 6], [1, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: 44, top: 150, opacity: o, filter: 'drop-shadow(0 4px 0 rgba(16,27,50,0.6))' }}>
      <OddlyLogo size={46} />
    </div>
  );
};
