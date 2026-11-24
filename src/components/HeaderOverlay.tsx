import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, LAYOUT } from '../theme';
import { EpisodeData } from '../types';
import { clamp, pop } from '../utils/anim';
import { OddlyLogo } from './OddlyLogo';

/** Compact info header: logo · HUMAN FACTS · EP.003 · short title. */
export const HeaderOverlay: React.FC<{ header: EpisodeData['header']; hideFrom: number; progressTotal: number; mode?: 'logo' | 'full' }> = ({ header, hideFrom, progressTotal, mode = 'logo' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = pop(frame, 2, fps, 14);
  const out = interpolate(frame, [hideFrom, hideFrom + 8], [1, 0], clamp);
  const { x, y, w } = LAYOUT.header;
  const progress = Math.min(1, frame / Math.max(1, hideFrom));
  if (mode === 'logo') {
    // default: brand logo only, no title / episode
    return (
      <div style={{ position: 'absolute', left: 0, right: 0, top: y + 6, display: 'flex', justifyContent: 'center', opacity: out, transform: `translateY(${(1 - e) * -60}px)` }}>
        <div style={{ padding: '12px 26px', borderRadius: 999, background: 'rgba(16,27,50,0.55)', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
          <OddlyLogo size={46} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, opacity: out, transform: `translateY(${(1 - e) * -60}px)`, fontFamily: FONT }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '16px 22px',
          borderRadius: 26,
          background: 'rgba(16,27,50,0.82)',
          border: '2px solid rgba(127,200,255,0.35)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        }}
      >
        <OddlyLogo size={40} />
        <div style={{ width: 2, height: 40, background: 'rgba(127,200,255,0.4)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ background: COLORS.yellow, color: COLORS.navy, fontWeight: 900, fontSize: 20, padding: '4px 12px', borderRadius: 999, letterSpacing: 1.5 }}>
              {header.category}
            </span>
            <span style={{ color: COLORS.lightBlue, fontWeight: 800, fontSize: 22, letterSpacing: 2 }}>{header.episode_label}</span>
          </div>
          <div style={{ color: COLORS.white, fontWeight: 800, fontSize: 27, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {header.short_title}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, marginLeft: 24, marginRight: 24, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.18)' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 3, background: COLORS.yellow }} />
      </div>
    </div>
  );
};
