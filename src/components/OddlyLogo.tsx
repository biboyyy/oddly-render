import React from 'react';
import { COLORS, FONT } from '../theme';

/** ODDLY wordmark: the first O is an off-centre "odd eye". */
export const OddlyLogo: React.FC<{ size?: number; color?: string }> = ({ size = 44, color = COLORS.white }) => {
  const s = size;
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontFamily: FONT, fontWeight: 900, fontSize: s, color, letterSpacing: s * 0.02, lineHeight: 1 }}>
      <svg width={s * 0.95} height={s * 0.95} viewBox="0 0 100 100" style={{ marginRight: s * 0.04 }}>
        <circle cx="50" cy="50" r="44" fill={COLORS.yellow} stroke={COLORS.navy} strokeWidth="6" />
        <circle cx="62" cy="42" r="19" fill={COLORS.navy} />
        <circle cx="68" cy="36" r="6" fill={COLORS.white} />
      </svg>
      <span>DDLY</span>
    </div>
  );
};
