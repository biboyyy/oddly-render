import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { LAYOUT } from '../theme';
import { NarratorCue, SceneData } from '../types';
import { activeCue, pop } from '../utils/anim';
import { NarratorMascot } from './NarratorMascot';

/** Fixed bottom-left narrator mascot. Expression from storyboard cues,
 *  lip-sync from precomputed narration loudness, procedural blink + bob. */
export const NarratorOverlay: React.FC<{ scenes: SceneData[]; hideFrom: number; offset?: number }> = ({ scenes, hideFrom, offset = 0 }) => {
  const frame = useCurrentFrame() + offset;
  const { fps } = useVideoConfig();
  const scene = scenes.find((s) => frame >= s.from && frame < s.from + s.frames) ?? scenes[scenes.length - 1];
  const local = frame - scene.from;
  const cue = activeCue<NarratorCue>(scene.narrator, local);
  const expr = cue?.expr ?? 'neutral';
  const mouth = scene.mouth[Math.max(0, Math.min(scene.mouth.length - 1, local))] ?? 0;
  // blink: every ~3.1s, 4 frames
  const b = (frame + 11) % 94;
  const blink = b < 2 ? b / 2 : b < 4 ? (4 - b) / 2 : 0;
  const bob = Math.sin(frame / 14) * 3 + (cue ? -6 * Math.max(0, 1 - (local - cue.at) / 6) * (local >= cue.at ? 1 : 0) : 0);
  const enter = pop(frame - offset, 4, fps, 13);
  const exit = frame >= hideFrom ? Math.max(0, 1 - (frame - hideFrom) / 8) : 1;
  const { x, y, w, h } = LAYOUT.narrator;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `translateY(${(1 - enter) * 160 + (1 - exit) * 200}px)`,
        opacity: exit,
        filter: 'drop-shadow(0 10px 18px rgba(8,14,30,0.45))',
      }}
    >
      <NarratorMascot expr={expr} mouth={mouth} blink={blink} bob={bob} look={0.45} />
    </div>
  );
};
