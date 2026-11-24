import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';
import { clamp, pop } from '../utils/anim';
import { OddlyLogo } from './OddlyLogo';

/** Clean branded end card: ODDLY. / STAY CURIOUS. */
export const OutroComponent: React.FC<{ lines: string[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const bg = interpolate(frame, [0, 8], [0, 1], clamp);
  const logo = pop(frame, 3, fps, 10);
  const tag = pop(frame, 14, fps, 12);
  const ring = interpolate(frame, [0, 40], [0.6, 1.15], clamp);
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0.0], clamp);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #1C3566 0%, ${COLORS.navy} 70%)`, opacity: bg, fontFamily: FONT }}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: out }}>
        <div style={{ position: 'absolute', width: 620, height: 620, borderRadius: '50%', border: `6px solid ${COLORS.blue}`, transform: `scale(${ring})`, opacity: 0.6 }} />
        <div style={{ position: 'absolute', width: 760, height: 760, borderRadius: '50%', border: `3px solid ${COLORS.lightBlue}`, transform: `scale(${ring * 0.95})`, opacity: 0.25 }} />
        <div style={{ transform: `scale(${logo})` }}>
          <OddlyLogo size={170} />
        </div>
        <div style={{ height: 8, width: 300 * tag, background: COLORS.yellow, borderRadius: 4, margin: '36px 0 30px' }} />
        <div style={{ color: COLORS.yellow, fontWeight: 900, fontSize: 70, letterSpacing: 10, transform: `translateY(${(1 - tag) * 40}px)`, opacity: tag }}>
          {lines[1] ?? 'STAY CURIOUS.'}
        </div>
        <div style={{ color: COLORS.lightBlue, fontWeight: 700, fontSize: 30, letterSpacing: 4, marginTop: 28, opacity: interpolate(frame, [26, 36], [0, 1], clamp) }}>
          FOLLOW FOR MORE HUMAN FACTS
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
