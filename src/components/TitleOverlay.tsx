import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, LAYOUT } from '../theme';
import { Overlay } from '../types';
import { clamp, pop } from '../utils/anim';

/** Big educational title cards ("YOUR BRAIN CAN'T FEEL PAIN"). Words listed
 *  in `highlight` render yellow. Styles: scale_up (default), slide, stamp. */
export const TitleOverlay: React.FC<{ overlays: Overlay[] }> = ({ overlays }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {overlays.map((o, idx) => {
        if (frame < o.at || frame >= o.until) return null;
        const s = pop(frame, o.at, fps, o.style === 'stamp' ? 8 : 12);
        const out = interpolate(frame, [o.until - 6, o.until], [1, 0], clamp);
        const hl = new Set((o.highlight || []).map((w) => w.toUpperCase()));
        const lines = o.text.split('\n');
        const size = o.size ?? 84;
        let transform = `scale(${0.4 + 0.6 * s})`;
        if (o.style === 'slide') transform = `translateX(${(1 - s) * -700}px)`;
        if (o.style === 'stamp') transform = `scale(${1.8 - 0.8 * s}) rotate(${(1 - s) * -8 - 2}deg)`;
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: 50,
              right: 50,
              top: o.y ?? LAYOUT.overlayTitle.y,
              display: 'flex',
              justifyContent: 'center',
              opacity: Math.min(1, s * 1.5) * out,
              transform,
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: size,
                lineHeight: 1.05,
                textAlign: 'center',
                color: COLORS.white,
                padding: '18px 28px 22px',
                borderRadius: 28,
                background: 'rgba(16,27,50,0.78)',
                border: `4px solid ${COLORS.yellow}`,
                boxShadow: '0 16px 0 rgba(16,27,50,0.35), 0 24px 50px rgba(0,0,0,0.35)',
                letterSpacing: 0.5,
              }}
            >
              {lines.map((line, li) => (
                <div key={li}>
                  {line.split(' ').map((w, wi) => (
                    <span key={wi} style={{ color: hl.has(w.replace(/[^\p{L}'’]/gu, '').toUpperCase()) ? COLORS.yellow : COLORS.white }}>
                      {w}{' '}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
};
