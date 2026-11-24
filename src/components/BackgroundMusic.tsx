import React from 'react';
import { Audio, Sequence, interpolate, staticFile } from 'remotion';
import { EpisodeData } from '../types';

/** Music bed with automatic ducking under narration. */
export const BackgroundMusic: React.FC<{ data: EpisodeData }> = ({ data }) => {
  if (!data.music) return null;
  const { volume, duckTo, src } = data.music;
  const segments = data.music.segments ?? [{ src, from: 0, to: data.durationInFrames }];
  const ranges = data.scenes.map((s) => [s.from + s.audio.offset - 4, s.from + s.audio.offset + s.audio.frames + 4]);
  const total = data.durationInFrames;
  return (
    <>
    {segments.map((seg, si) => (
    <Sequence key={si} from={seg.from} durationInFrames={seg.to - seg.from} layout="none">
    <Audio
      src={staticFile(seg.src)}
      volume={(lf) => {
        const f = lf + seg.from;
        const xf = Math.min(1, lf / 12, (seg.to - seg.from - lf) / 12);
        let duck = 0;
        for (const [a, b] of ranges) {
          if (f >= a - 8 && f <= b + 8) {
            duck = Math.max(duck, Math.min(1, (f - (a - 8)) / 8, (b + 8 - f) / 8));
          }
        }
        const base = volume + (duckTo - volume) * duck;
        const fadeOut = interpolate(f, [total - 30, total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const fadeIn = interpolate(f, [0, 12], [0.4, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return base * fadeOut * fadeIn * (segments.length > 1 ? Math.max(0, xf) : 1);
      }}
    />
    </Sequence>
    ))}
    </>
  );
};
