import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, LAYOUT } from '../theme';
import { SubtitleChunk } from '../types';
import { clamp, pop } from '../utils/anim';

const stroke = (px: number) => ({
  WebkitTextStroke: `${px}px ${COLORS.navy}`,
  paintOrder: 'stroke fill' as const,
});

/** Phrase-chunk subtitles. White bold, keywords yellow, the word being
 *  spoken gets a subtle lift. Lives in LAYOUT.subtitle (never overlaps
 *  the narrator box — verified by QC). */
export const SubtitleRenderer: React.FC<{ chunks: SubtitleChunk[]; fontSize?: number; mode?: 'phrase' | 'punch' }> = ({ chunks, fontSize: fs, mode = 'phrase' }) => {
  const punch = mode === 'punch';
  const fontSize = fs ?? (punch ? 104 : 70);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunk = chunks.find((c) => frame >= c.start && frame < c.end);
  if (!chunk) return null;
  const s = pop(frame, chunk.start, fps, 12);
  const outT = interpolate(frame, [chunk.end - 4, chunk.end], [1, 0], clamp);
  const { w, h, centerX } = LAYOUT.subtitle;
  const y = punch ? 1080 : LAYOUT.subtitle.y;
  const len = chunk.words.map((w) => w.text).join(' ').length;
  const size = punch ? (len > 12 ? fontSize * 0.8 : fontSize) : len > 26 ? fontSize * 0.86 : fontSize;
  const tilt = punch ? ((chunk.start % 3) - 1) * 2.5 : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: centerX - w / 2,
        top: y,
        width: w,
        height: h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.12,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          transform: `scale(${(punch ? 0.4 : 0.7) + (punch ? 0.6 : 0.3) * s}) translateY(${(1 - s) * 30}px) rotate(${tilt}deg)`,
          opacity: Math.min(1, s * 1.4) * outT,
          textShadow: '0 8px 0 rgba(16,27,50,0.55), 0 14px 28px rgba(0,0,0,0.35)',
        }}
      >
        {chunk.words.map((w, i) => {
          const speaking = frame >= w.start && frame < w.end + 2;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                margin: '0 0.16em',
                color: w.hl ? COLORS.yellow : COLORS.white,
                transform: speaking ? 'translateY(-4px) scale(1.06)' : 'none',
                ...stroke(size * 0.16),
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
