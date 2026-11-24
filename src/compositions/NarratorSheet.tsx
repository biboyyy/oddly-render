import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { NarratorMascot } from '../components/NarratorMascot';
import { NarratorExpr } from '../types';
import { loadFonts } from '../utils/fonts';

loadFonts();

export const EXPRESSIONS: NarratorExpr[] = ['neutral', 'explaining', 'surprised', 'thinking', 'pointing'];

/** Single expression on a transparent background (PNG export). */
export const NarratorStill: React.FC<{ expr: NarratorExpr; talking?: boolean }> = ({ expr, talking }) => (
  <AbsoluteFill style={{ background: 'transparent', padding: 40 }}>
    <NarratorMascot expr={expr} mouth={talking ? 0.6 : 0} blink={0} />
  </AbsoluteFill>
);

/** Model sheet with all expressions; frame number animates blink/talk test. */
export const NarratorSheet: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: 'transparent', flexDirection: 'row', padding: 30, gap: 20 }}>
      {EXPRESSIONS.map((e, i) => (
        <div key={e} style={{ width: 360, height: 495 }}>
          <NarratorMascot expr={e} mouth={i === 1 ? 0.5 + 0.5 * Math.sin(f / 3) : 0} blink={0} />
        </div>
      ))}
    </AbsoluteFill>
  );
};
