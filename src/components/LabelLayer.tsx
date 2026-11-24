import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';
import { AnchorTrack, Label } from '../types';
import { clamp, pop } from '../utils/anim';

const TONE: Record<string, string> = { yellow: COLORS.yellow, blue: COLORS.lightBlue, red: COLORS.red, white: COLORS.white };

/** Labels pinned to 3D anchor points exported from Blender (screen-space
 *  per frame). A dot sits on the object, a leader line runs to a pill. */
export const LabelLayer: React.FC<{ labels: Label[]; anchors: Record<string, AnchorTrack> }> = ({ labels, anchors }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return (
    <>
      {labels.map((l, i) => {
        if (frame < l.at || frame >= l.until) return null;
        const track = anchors[l.anchor];
        const p = track?.[Math.min(track.length - 1, frame)];
        if (!p || !p[2]) return null;
        const ax = p[0] * width;
        const ay = p[1] * height;
        const s = pop(frame, l.at, fps, 13);
        const out = interpolate(frame, [l.until - 6, l.until], [1, 0], clamp);
        const side = l.side ?? (ax > width / 2 ? 'left' : 'right');
        const dx = (l.dx ?? 150) * (side === 'left' ? -1 : 1);
        const dy = l.dy ?? -90;
        const lx = ax + dx * s;
        const ly = ay + dy * s;
        const color = TONE[l.tone ?? 'yellow'];
        // keep the pill inside safe margins
        const pillW = 380;
        const px = Math.max(40, Math.min(width - 40 - pillW, side === 'left' ? lx - pillW : lx));
        const icon = l.icon === 'check' ? '✓' : l.icon === 'cross' ? '✕' : null;
        return (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: out, pointerEvents: 'none' }}>
            <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
              <line x1={ax} y1={ay} x2={lx} y2={ly} stroke={COLORS.navy} strokeWidth={9} strokeLinecap="round" />
              <line x1={ax} y1={ay} x2={lx} y2={ly} stroke={color} strokeWidth={5} strokeLinecap="round" />
              <circle cx={ax} cy={ay} r={12 * s} fill={color} stroke={COLORS.navy} strokeWidth={4} />
              <circle cx={ax} cy={ay} r={22 + 10 * ((frame - l.at) % 30) / 30} fill="none" stroke={color} strokeWidth={3} opacity={1 - ((frame - l.at) % 30) / 30} />
            </svg>
            <div
              style={{
                position: 'absolute',
                left: px,
                top: ly - 34,
                width: pillW,
                display: 'flex',
                justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
                transform: `scale(${s})`,
                transformOrigin: side === 'left' ? 'right center' : 'left center',
              }}
            >
              <div
                style={{
                  fontFamily: FONT,
                  background: COLORS.navy,
                  border: `3px solid ${color}`,
                  borderRadius: 18,
                  padding: '14px 24px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
                  maxWidth: pillW,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: COLORS.white, fontWeight: 900, fontSize: 46, lineHeight: 1.1 }}>
                  {icon && (
                    <span style={{ color: l.icon === 'cross' ? COLORS.red : '#5BE59B', fontSize: 48 }}>{icon}</span>
                  )}
                  <span>{l.text}</span>
                </div>
                {l.sub && <div style={{ color, fontWeight: 700, fontSize: 31, marginTop: 4 }}>{l.sub}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
