import { Easing, interpolate, spring } from 'remotion';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0→1 entrance and 1→0 exit envelope for an element visible in [at, until). */
export const inOut = (frame: number, at: number, until: number, inDur = 8, outDur = 6) => {
  const a = interpolate(frame, [at, at + inDur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const b = interpolate(frame, [until - outDur, until], [1, 0], { ...clamp, easing: Easing.in(Easing.cubic) });
  return Math.min(a, b);
};

export const pop = (frame: number, at: number, fps: number, damping = 11) =>
  spring({ frame: frame - at, fps, config: { damping, stiffness: 170, mass: 0.7 } });

/** Active cue (last cue whose `at` <= frame). */
export function activeCue<T extends { at: number }>(cues: T[], frame: number): T | undefined {
  let cur: T | undefined;
  for (const c of cues) if (c.at <= frame) cur = c;
  return cur;
}
