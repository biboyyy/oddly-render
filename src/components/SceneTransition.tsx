import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { clamp } from '../utils/anim';

/** Short transition accent at the start of a scene (hard cuts + punch). */
export const SceneTransition: React.FC<{ type?: 'flash' | 'zoom' | 'whip' | 'none'; children: React.ReactNode }> = ({ type = 'zoom', children }) => {
  const frame = useCurrentFrame();
  if (type === 'none') return <>{children}</>;
  const zoom = type === 'zoom' || type === 'whip' ? interpolate(frame, [0, 10], [1.12, 1], { ...clamp }) : 1;
  const blur = type === 'whip' ? interpolate(frame, [0, 7], [18, 0], clamp) : type === 'zoom' ? interpolate(frame, [0, 6], [6, 0], clamp) : 0;
  const shift = type === 'whip' ? interpolate(frame, [0, 8], [-120, 0], clamp) : 0;
  const flash = interpolate(frame, [0, type === 'flash' ? 8 : 5], [type === 'flash' ? 0.85 : 0.35, 0], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateX(${shift}px) scale(${zoom})`, filter: blur ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ background: '#FFFFFF', opacity: flash, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
