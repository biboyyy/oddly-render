import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';
import { AnchorTrack } from '../types';
import { clamp, pop } from '../utils/anim';
import { rng } from '../three/math';

export type Fx = {
  at: number;
  until: number;
  type: 'speedlines' | 'shock' | 'sweat' | 'sparkle' | 'question' | 'burst' | 'flash' | 'tears' | 'thought' | 'stamp' | 'vignette' | 'rain' | 'notes' | 'diary' | 'gas' | 'bank' | 'chat' | 'card' | 'timer' | 'call' | 'siren' | 'blackout' | 'memory' | 'title' | 'vcall';
  start?: number;
  rate?: number;
  title?: string;
  rows?: Array<[string, string, string?]>;
  messages?: Array<{ from: string; text: string; color?: string }>;
  driftX?: number;
  driftY?: number;
  size?: number;
  lines?: string[];
  step?: number;
  count?: number;
  opacity?: number;
  anchor?: string;
  x?: number; // 0..1 when no anchor
  y?: number;
  text?: string;
  color?: string;
  dx?: number;
  dy?: number;
  pip?: string;
  slip?: number;
};

/** Anime / manga style 2D accents layered over the toon 3D render. */
export const FxLayer: React.FC<{ fx: Fx[]; anchors: Record<string, AnchorTrack> }> = ({ fx, anchors }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {fx.map((e, i) => {
        if (frame < e.at || frame >= e.until) return null;
        const local = frame - e.at;
        const life = e.until - e.at;
        const out = interpolate(frame, [e.until - 5, e.until], [1, 0], clamp);
        let x = (e.x ?? 0.5) * width;
        let y = (e.y ?? 0.45) * height;
        if (e.anchor) {
          const p = anchors[e.anchor]?.[Math.min((anchors[e.anchor]?.length ?? 1) - 1, frame)];
          if (p) {
            x = p[0] * width;
            y = p[1] * height;
          }
        }
        x += e.dx ?? 0;
        y += e.dy ?? 0;
        const s = pop(frame, e.at, fps, 9);
        switch (e.type) {
          case 'speedlines': {
            const r = rng(e.at * 31 + Math.floor(local / 2));
            const lines = Array.from({ length: 46 }, (_, k) => {
              const a = (k / 46) * Math.PI * 2 + r() * 0.08;
              const r0 = 380 + r() * 260;
              const r1 = 1500;
              const w = 4 + r() * 10;
              const cx = width / 2, cy = height * 0.45;
              const p1 = [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0];
              const p2 = [cx + Math.cos(a + w / 900) * r1, cy + Math.sin(a + w / 900) * r1];
              const p3 = [cx + Math.cos(a - w / 900) * r1, cy + Math.sin(a - w / 900) * r1];
              return <polygon key={k} points={`${p1.join(',')} ${p2.join(',')} ${p3.join(',')}`} fill={e.color ?? COLORS.white} />;
            });
            return (
              <svg key={i} width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: 0.55 * out * Math.min(1, local / 3) }}>
                {lines}
              </svg>
            );
          }
          case 'shock':
          case 'question': {
            const txt = e.text ?? (e.type === 'shock' ? '!' : '?');
            const wob = Math.sin(local / 2.5) * 6;
            return (
              <div key={i} style={{ position: 'absolute', left: x - 60, top: y - 140, width: 120, textAlign: 'center', transform: `scale(${s}) rotate(${wob - 8}deg)`, opacity: out, fontFamily: FONT, fontWeight: 900, fontSize: 150, color: e.color ?? COLORS.yellow, WebkitTextStroke: `10px ${COLORS.navy}`, paintOrder: 'stroke fill', lineHeight: 1 }}>
                {txt}
              </div>
            );
          }
          case 'sweat': {
            const fall = interpolate(local, [0, life], [0, 70], clamp);
            return (
              <svg key={i} width={80} height={110} viewBox="0 0 80 110" style={{ position: 'absolute', left: x, top: y + fall, opacity: out, transform: `scale(${s})` }}>
                <path d="M40,6 C52,34 70,54 70,72 A30,30 0 0 1 10,72 C10,54 28,34 40,6 Z" fill="#9ED6FF" stroke={COLORS.navy} strokeWidth={6} />
                <ellipse cx={30} cy={70} rx={6} ry={10} fill="#FFFFFF" />
              </svg>
            );
          }
          case 'sparkle': {
            const r = rng(e.at * 17 + i);
            return (
              <svg key={i} width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: out }}>
                {Array.from({ length: 7 }, (_, k) => {
                  const a = r() * Math.PI * 2;
                  const d = 90 + r() * 170;
                  const px = x + Math.cos(a) * d;
                  const py = y + Math.sin(a) * d;
                  const tw = Math.max(0, Math.sin((local + k * 5) / 4));
                  const sz = (18 + r() * 22) * tw * s;
                  return <path key={k} d={`M${px},${py - sz} L${px + sz * 0.28},${py - sz * 0.28} L${px + sz},${py} L${px + sz * 0.28},${py + sz * 0.28} L${px},${py + sz} L${px - sz * 0.28},${py + sz * 0.28} L${px - sz},${py} L${px - sz * 0.28},${py - sz * 0.28} Z`} fill={e.color ?? COLORS.yellow} stroke={COLORS.navy} strokeWidth={4} />;
                })}
              </svg>
            );
          }
          case 'burst': {
            const pts = Array.from({ length: 24 }, (_, k) => {
              const a = (k / 24) * Math.PI * 2;
              const rr = k % 2 ? 120 : 190;
              return `${Math.cos(a) * rr},${Math.sin(a) * rr}`;
            }).join(' ');
            return (
              <div key={i} style={{ position: 'absolute', left: x - 200, top: y - 200, width: 400, height: 400, transform: `scale(${s}) rotate(${-6 + local * 0.4}deg)`, opacity: out }}>
                <svg viewBox="-200 -200 400 400" width={400} height={400} style={{ position: 'absolute', inset: 0 }}>
                  <polygon points={pts} fill={e.color ?? COLORS.yellow} stroke={COLORS.navy} strokeWidth={10} strokeLinejoin="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 64, color: COLORS.navy, transform: 'rotate(-8deg)' }}>{e.text ?? 'AH!'}</div>
              </div>
            );
          }
          case 'tears': {
            // emoji-style waterfall tears from both eyes (anchor = head)
            const sp = e.dx ?? 46;
            return (
              <svg key={i} width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: out }}>
                {[-1, 1].map((sd) => {
                  const ex = x + sd * sp;
                  const ey = y - 10;
                  const len = Math.min(1, local / 6) * 260;
                  const wob = Math.sin(local / 2 + sd) * 6;
                  return (
                    <g key={sd}>
                      <path d={`M${ex - 14},${ey} Q${ex + sd * 40 + wob},${ey + len * 0.4} ${ex + sd * 70},${ey + len} L${ex + sd * 100},${ey + len} Q${ex + sd * 60 + wob},${ey + len * 0.4} ${ex + 14},${ey} Z`} fill="#7FC8FF" stroke={COLORS.navy} strokeWidth={6} strokeLinejoin="round" />
                      {[0, 1, 2].map((k) => {
                        const t = ((local + k * 4) % 12) / 12;
                        return <circle key={k} cx={ex + sd * (85 + 40 * t)} cy={ey + len + 10 - 30 * Math.sin(t * Math.PI)} r={9 * (1 - t) + 3} fill="#7FC8FF" stroke={COLORS.navy} strokeWidth={4} />;
                      })}
                    </g>
                  );
                })}
              </svg>
            );
          }
          case 'thought': {
            return (
              <div key={i} style={{ position: 'absolute', left: x - 230, top: y - 300, width: 460, transform: `scale(${s})`, transformOrigin: '30% 100%', opacity: out }}>
                <svg viewBox="0 0 460 300" width={460} height={300} style={{ position: 'absolute', inset: 0 }}>
                  <path d="M80,190 C20,190 20,110 80,110 C70,40 170,30 190,70 C220,10 330,20 330,80 C420,70 440,170 370,190 C380,240 290,260 260,220 C230,260 120,250 120,210 C100,215 85,205 80,190 Z" fill="#FFFFFF" stroke={COLORS.navy} strokeWidth={8} />
                  <circle cx={110} cy={250} r={18} fill="#FFFFFF" stroke={COLORS.navy} strokeWidth={6} />
                  <circle cx={80} cy={285} r={10} fill="#FFFFFF" stroke={COLORS.navy} strokeWidth={5} />
                </svg>
                <div style={{ position: 'absolute', left: 60, top: 70, width: 340, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 44, lineHeight: 1.05, color: COLORS.navy }}>{e.text ?? '...'}</div>
              </div>
            );
          }
          case 'stamp': {
            // big comic word slammed onto the screen
            const sc = 2.2 - 1.2 * s;
            return (
              <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: y - 90, display: 'flex', justifyContent: 'center', opacity: out * Math.min(1, s * 2) }}>
                <div style={{ transform: `scale(${sc}) rotate(${-6 + (1 - s) * -10}deg)`, fontFamily: FONT, fontWeight: 900, fontSize: Math.min(130, Math.round(1100 / Math.max(1, (e.text ?? '').length))), color: e.color ?? COLORS.yellow, WebkitTextStroke: `14px ${COLORS.navy}`, paintOrder: 'stroke fill', textShadow: `0 12px 0 ${COLORS.navy}`, letterSpacing: 2, whiteSpace: 'nowrap' }}>{e.text}</div>
              </div>
            );
          }
          case 'bank': {
            // mobile-banking style breakdown: rows slide in one by one
            const rows = e.rows ?? [];
            const step = e.step ?? 14;
            const enter = Math.min(1, local / 8);
            return (
              <div key={i} style={{ position: 'absolute', left: 170, right: 170, top: (e.y ?? 0.16) * height, opacity: out * enter, transform: `translateY(${(1 - enter) * 50}px)`, fontFamily: FONT }}>
                <div style={{ background: '#FFFFFF', borderRadius: 40, border: `8px solid ${COLORS.navy}`, overflow: 'hidden', boxShadow: '0 16px 0 rgba(16,27,50,0.45)' }}>
                  <div style={{ background: '#1E5AA8', color: '#FFFFFF', padding: '22px 30px', fontWeight: 900, fontSize: 34, letterSpacing: 1 }}>{e.title ?? 'm-Banking'}</div>
                  <div style={{ padding: '14px 30px 22px' }}>
                    {rows.map(([label, amt, col], k) => {
                      const a = Math.max(0, Math.min(1, (local - 6 - k * step) / 6));
                      if (a <= 0) return null;
                      const last = k === rows.length - 1;
                      return (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: last ? '16px 0 4px' : '10px 0', borderTop: last ? `4px dashed ${COLORS.navy}33` : 'none', opacity: a, transform: `translateX(${(1 - a) * 40}px)` }}>
                          <span style={{ fontSize: last ? 36 : 31, fontWeight: last ? 900 : 700, color: COLORS.navy }}>{label}</span>
                          <span style={{ fontSize: last ? 46 : 33, fontWeight: 900, color: col ?? (amt.startsWith('-') ? '#E5484D' : '#1E9E5A') }}>{amt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }
          case 'chat': {
            // family group chat: bubbles pop in one by one
            const msgs = e.messages ?? [];
            const step = e.step ?? 24;
            const enter = Math.min(1, local / 8);
            return (
              <div key={i} style={{ position: 'absolute', left: 140, right: 140, top: (e.y ?? 0.15) * height, opacity: out * enter, transform: `translateY(${(1 - enter) * 50}px)`, fontFamily: FONT }}>
                <div style={{ background: '#EFE7DD', borderRadius: 40, border: `8px solid ${COLORS.navy}`, overflow: 'hidden', boxShadow: '0 16px 0 rgba(16,27,50,0.45)' }}>
                  <div style={{ background: '#128C7E', color: '#FFFFFF', padding: '20px 30px', fontWeight: 900, fontSize: 32 }}>{e.title ?? 'Keluarga Besar'}</div>
                  <div style={{ padding: '18px 22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {msgs.map((m, k) => {
                      const a = Math.max(0, Math.min(1, (local - 6 - k * step) / 5));
                      if (a <= 0) return null;
                      return (
                        <div key={k} style={{ alignSelf: 'flex-start', maxWidth: '88%', background: '#FFFFFF', borderRadius: 22, padding: '12px 20px', boxShadow: '0 3px 0 rgba(0,0,0,0.12)', transform: `scale(${0.85 + 0.15 * a})`, transformOrigin: 'left top', opacity: a }}>
                          <div style={{ fontSize: 24, fontWeight: 900, color: m.color ?? '#C2185B' }}>{m.from}</div>
                          <div style={{ fontSize: 32, fontWeight: 700, color: '#1B1E2B', lineHeight: 1.25 }}>{m.text}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }
          case 'timer': {
            // "since your heart stopped" clock: starts at e.start seconds, runs e.rate x real time
            const sec = Math.max(0, (e.start ?? 0) + (local / fps) * (e.rate ?? 1));
            const mm = Math.floor(sec / 60), ss = Math.floor(sec % 60);
            const red = e.color === 'red';
            const blink = red ? 0.55 + 0.45 * Math.abs(Math.sin(local / 6)) : 1;
            return (
              <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: (e.y ?? 0.09) * height, display: 'flex', justifyContent: 'center', opacity: out, fontFamily: FONT }}>
                <div style={{ background: 'rgba(10,14,24,0.82)', borderRadius: 26, padding: '14px 36px 18px', textAlign: 'center', border: `3px solid ${red ? '#FF5A5F' : 'rgba(255,255,255,0.25)'}` }}>
                  <div style={{ color: '#C9D3E0', fontWeight: 800, fontSize: 26, letterSpacing: 3 }}>{e.text ?? 'SEJAK JANTUNGMU BERHENTI'}</div>
                  <div style={{ color: red ? '#FF5A5F' : '#FFFFFF', fontWeight: 900, fontSize: 96, lineHeight: 1, letterSpacing: 4, opacity: blink, fontVariantNumeric: 'tabular-nums' }}>{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</div>
                </div>
              </div>
            );
          }
          case 'vcall': {
            // sw10: full-screen WhatsApp-style video call UI over the 3D 'phone camera' view (no fade-out: consecutive call scenes join)
            const sec = Math.floor((e.start ?? 0) + local / fps);
            const tm = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
            const jig = e.slip != null && local >= e.slip ? Math.max(0, 1 - (local - e.slip) / 10) : 0;
            const jx = jig * 18 * Math.sin(local * 2.3), jy = jig * 12 * Math.cos(local * 1.7);
            return (
              <AbsoluteFill key={i} style={{ fontFamily: FONT, transform: `translate(${jx}px, ${jy}px)` }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 300, background: 'linear-gradient(rgba(0,0,0,0.62), rgba(0,0,0,0))' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 360, background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.6))' }} />
                <div style={{ position: 'absolute', left: 60, top: 150, color: '#FFFFFF' }}>
                  <div style={{ fontSize: 30, fontWeight: 700, opacity: 0.85, letterSpacing: 1 }}>🔒 Panggilan video</div>
                  <div style={{ fontSize: 64, fontWeight: 900, marginTop: 4, textShadow: '0 3px 10px rgba(0,0,0,0.5)' }}>{e.title ?? 'Ibu ❤'}</div>
                  <div style={{ fontSize: 38, fontWeight: 700, opacity: 0.9, fontVariantNumeric: 'tabular-nums' }}>{e.text ?? tm}</div>
                </div>
                {e.pip !== 'none' && (
                  <div style={{ position: 'absolute', right: 50, top: 150, width: 220, height: 330, borderRadius: 28, overflow: 'hidden', border: '4px solid rgba(255,255,255,0.85)',
                    background: 'linear-gradient(#3B4A6B, #1C2436)', boxShadow: '0 10px 30px rgba(0,0,0,0.45)' }}>
                    <div style={{ position: 'absolute', left: 30, right: 30, bottom: -40, height: 170, borderRadius: '50% 50% 20px 20px', background: '#DCE9F5' }} />
                    <div style={{ position: 'absolute', left: 58, top: 70, width: 104, height: 118, borderRadius: '50%', background: '#E9B48C' }} />
                    <div style={{ position: 'absolute', left: 52, top: 56, width: 116, height: 52, borderRadius: '60px 60px 20px 20px', background: '#1B1E2B' }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 10, textAlign: 'center', color: '#FFFFFF', fontSize: 24, fontWeight: 800 }}>{e.pip ?? 'Kamu'}</div>
                  </div>
                )}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 120, display: 'flex', justifyContent: 'center', gap: 56 }}>
                  {['#3A3F4B', '#3A3F4B', '#3A3F4B', '#E5484D'].map((c, k) => (
                    <div key={k} style={{ width: 118, height: 118, borderRadius: 999, background: c, opacity: 0.92, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, color: '#fff' }}>
                      {['🎤', '📷', '🔄', '✆'][k]}
                    </div>
                  ))}
                </div>
              </AbsoluteFill>
            );
          }
          case 'call': {
            // incoming call card with pulsing ring
            const enter = Math.min(1, local / 8);
            const ring = 1 + 0.06 * Math.sin(local / 3);
            return (
              <div key={i} style={{ position: 'absolute', left: 230, right: 230, top: (e.y ?? 0.2) * height, opacity: out * enter, transform: `translateY(${(1 - enter) * 40}px)`, fontFamily: FONT, textAlign: 'center' }}>
                <div style={{ background: 'linear-gradient(#24324F, #101B32)', borderRadius: 48, padding: '40px 30px 44px', border: `8px solid ${COLORS.navy}`, boxShadow: '0 16px 0 rgba(0,0,0,0.4)' }}>
                  <div style={{ width: 150, height: 150, borderRadius: 999, margin: '0 auto 18px', background: '#E3AE86', border: '6px solid #FFFFFF', transform: `scale(${ring})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 70, fontWeight: 900, color: '#FFFFFF' }}>{(e.title ?? 'Ibu').slice(0, 1)}</div>
                  <div style={{ color: '#FFFFFF', fontWeight: 900, fontSize: 56 }}>{e.title ?? 'Ibu ❤'}</div>
                  <div style={{ color: '#C9D3E0', fontWeight: 700, fontSize: 32, marginTop: 6 }}>{e.text ?? 'memanggil...'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 34 }}>
                    <div style={{ width: 110, height: 110, borderRadius: 999, background: '#E5484D' }} />
                    <div style={{ width: 110, height: 110, borderRadius: 999, background: '#2FBF71', transform: `scale(${ring})` }} />
                  </div>
                </div>
              </div>
            );
          }
          case 'memory': {
            // warm faded flashback look: sepia/soft backdrop, glowing white edges, drifting light leak, grain
            const k = Math.min(1, local / 8) * out;
            const leak = 0.5 + 0.5 * Math.sin(local / 23);
            return (
              <AbsoluteFill key={i} style={{ opacity: k }}>
                <AbsoluteFill style={{ backdropFilter: 'sepia(0.55) saturate(0.85) brightness(1.06) contrast(0.92) blur(0.8px)' }} />
                <AbsoluteFill style={{ background: 'rgba(255,190,120,0.16)', mixBlendMode: 'soft-light' }} />
                <AbsoluteFill style={{ background: `radial-gradient(circle at ${20 + 60 * leak}% 15%, rgba(255,210,150,0.45), rgba(255,210,150,0) 45%)` }} />
                <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0) 55%, rgba(255,246,230,0.85) 100%)' }} />
                <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: 0.12, mixBlendMode: 'overlay' }}>
                  <filter id={`gr${i}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" seed={frame % 7} /></filter>
                  <rect width="100%" height="100%" filter={`url(#gr${i})`} />
                </svg>
              </AbsoluteFill>
            );
          }
          case 'blackout': {
            const k = Math.min(1, local / (e.step ?? 10));
            return <AbsoluteFill key={i} style={{ background: '#000', opacity: k * out }} />;
          }
          case 'siren': {
            const red = Math.floor(local / 9) % 2 === 0;
            const c = red ? 'rgba(255,40,60,0.55)' : 'rgba(40,110,255,0.55)';
            return <AbsoluteFill key={i} style={{ background: `radial-gradient(ellipse at ${red ? '0%' : '100%'} 20%, ${c} 0%, rgba(0,0,0,0) 60%)`, opacity: out }} />;
          }
          case 'title': {
            // trailer-style kinetic title: big serif caps revealed letter by letter, slow push, soft glow
            const txt: string = e.text ?? '';
            const cps = (e as any).cps ?? 16; // letters per second
            const shown = Math.min(txt.length, Math.floor((local / fps) * cps));
            const push = 1 + 0.04 * Math.min(1, local / (fps * 4));
            const size = e.size ?? 86;
            return (
              <div key={i} style={{ position: 'absolute', left: 70, right: 70, top: (e.y ?? 0.36) * height, opacity: out, textAlign: 'center', whiteSpace: 'pre-line', transform: `scale(${push})`, transformOrigin: '50% 50%' }}>
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, fontSize: size, lineHeight: 1.08, letterSpacing: 6, color: e.color ?? '#F5EBDD', textShadow: '0 0 28px rgba(255,200,120,0.35), 0 4px 18px rgba(0,0,0,0.85)' }}>
                  {txt.split('').map((ch, k) => (
                    <span key={k} style={{ opacity: k < shown ? 1 : k === shown ? ((local / fps) * cps) % 1 : 0 }}>{ch}</span>
                  ))}
                </div>
              </div>
            );
          }
          case 'card': {
            // centred caption card (data / "bersambung")
            const enter = Math.min(1, local / 10);
            return (
              <div key={i} style={{ position: 'absolute', left: 90, right: 90, top: (e.y ?? 0.2) * height, opacity: out * enter, transform: `translateY(${(1 - enter) * 30}px)`, fontFamily: FONT, textAlign: 'center' }}>
                <div style={{ background: 'rgba(16,27,50,0.86)', borderRadius: 34, padding: '30px 36px', border: `4px solid ${e.color ?? COLORS.yellow}` }}>
                  {e.title && <div style={{ color: e.color ?? COLORS.yellow, fontWeight: 900, fontSize: 64, lineHeight: 1.05 }}>{e.title}</div>}
                  {e.text && <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 36, marginTop: 12, lineHeight: 1.3 }}>{e.text}</div>}
                </div>
              </div>
            );
          }
          case 'gas': {
            // cartoon fart cloud: puffs bloom out of the anchor and linger (no convection in zero-g)
            const sz = e.size ?? 1;
            const sec = local / fps;
            const gx = x + (e.driftX ?? 0) * sec;
            const gy = y + (e.driftY ?? 0) * sec;
            const puffs = [[0, 0], [-120, -50], [110, -70], [-50, 95], [95, 85], [-165, 60], [170, 10], [15, -145]];
            return (
              <svg key={i} width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: out * 0.92 }}>
                {puffs.map(([px, py], k) => {
                  const t0 = k * 2.5;
                  const g = Math.max(0, Math.min(1, (local - t0) / 12));
                  if (g <= 0) return null;
                  const wob = Math.sin(local / 9 + k) * 10;
                  const rad = (70 + (k % 3) * 30) * sz * (0.4 + 0.6 * g) * (1 + 0.06 * Math.sin(local / 7 + k));
                  return <circle key={k} cx={gx + px * sz * (0.5 + 0.5 * g) + wob} cy={gy + py * sz * (0.5 + 0.5 * g) - wob * 0.5} r={rad} fill={e.color ?? '#B5E36B'} fillOpacity={0.78} stroke={COLORS.navy} strokeWidth={6} />;
                })}
                {e.text && (
                  <text x={gx + 170 * sz} y={gy - 150 * sz} fontFamily={FONT} fontWeight={900} fontSize={Math.round(70 * Math.max(1, sz * 1.3))} fill={COLORS.yellow} stroke={COLORS.navy} strokeWidth={10} paintOrder="stroke" transform={`rotate(-10 ${gx + 170 * sz} ${gy - 150 * sz})`} opacity={Math.min(1, local / 4)}>{e.text}</text>
                )}
              </svg>
            );
          }
          case 'notes': {
            // floating music notes rising from an anchor
            const glyphs = ['♪', '♫', '♩', '♬'];
            return (
              <div key={i} style={{ position: 'absolute', inset: 0, opacity: out }}>
                {Array.from({ length: 6 }, (_, k) => {
                  const t = ((local + k * 11) % 66) / 66;
                  const nx = x + Math.sin(k * 2.1 + t * 5) * 60 + (k - 2.5) * 34;
                  const ny = y - t * 360;
                  return <div key={k} style={{ position: 'absolute', left: nx, top: ny, fontSize: 64 + (k % 2) * 20, fontWeight: 900, color: e.color ?? COLORS.yellow, WebkitTextStroke: `5px ${COLORS.navy}`, paintOrder: 'stroke fill', opacity: Math.sin(t * Math.PI), transform: `rotate(${Math.sin(t * 6 + k) * 18}deg)` }}>{glyphs[k % 4]}</div>;
                })}
              </div>
            );
          }
          case 'diary': {
            // notebook page: entries appear one by one, each previous one gets crossed out
            const lines = e.lines ?? [];
            const step = e.step ?? 22;
            const shown = Math.min(lines.length, Math.floor(local / step) + 1);
            const enter = Math.min(1, local / 8);
            return (
              <div key={i} style={{ position: 'absolute', left: 110, right: 110, top: (e.y ?? 0.2) * height, opacity: out * enter, transform: `translateY(${(1 - enter) * 40}px) rotate(-2deg)` }}>
                <div style={{ background: '#FFF8E6', border: `6px solid ${COLORS.navy}`, borderRadius: 18, padding: '26px 34px 30px 70px', boxShadow: `0 14px 0 rgba(16,27,50,0.45)`, backgroundImage: 'repeating-linear-gradient(transparent 0 63px, #BFD7EE 63px 66px)', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 46, top: 0, bottom: 0, width: 4, background: '#F28C8C' }} />
                  {lines.slice(0, shown).map((ln, k) => {
                    const struck = k < shown - 1;
                    const sp = struck ? Math.min(1, (local - (k + 1) * step) / 8) : 0;
                    const typed = Math.min(ln.length, Math.floor(Math.max(0, local - k * step) * 1.6));
                    return (
                      <div key={k} style={{ position: 'relative', fontFamily: '"Comic Sans MS", "Patrick Hand", cursive', fontSize: 42, lineHeight: '66px', color: struck ? '#6B7A90' : COLORS.navy, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {ln.slice(0, typed)}
                        {struck && <div style={{ position: 'absolute', left: -6, top: 30, height: 7, width: `${sp * 102}%`, background: COLORS.red, borderRadius: 4, transform: 'rotate(-1.5deg)' }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          case 'rain': {
            const n = e.count ?? 70;
            const drops = [] as React.ReactNode[];
            for (let k = 0; k < n; k++) {
              const sx = ((k * 9301 + 49297) % 233280) / 233280;
              const sp = 0.6 + (((k * 4271 + 1237) % 1000) / 1000) * 0.6;
              const yy = (((k * 0.137 + (frame * 0.045 * sp)) % 1) + 1) % 1;
              const xx = sx * (width + 200) - 100 - yy * 120;
              const len = 40 + sp * 50;
              drops.push(<line key={k} x1={xx} y1={yy * (height + 200) - 100} x2={xx - len * 0.22} y2={yy * (height + 200) - 100 + len} stroke="rgba(220,235,255,0.55)" strokeWidth={3 * sp} strokeLinecap="round" />);
            }
            return <svg key={i} width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: (e.opacity ?? 0.7) * out }}>{drops}</svg>;
          }
          case 'vignette': {
            const pulse = 0.75 + 0.25 * Math.sin(local / 5);
            const fadeIn = Math.min(1, local / 10);
            return <AbsoluteFill key={i} style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, ${e.color ?? 'rgba(160,10,30,0.55)'} 100%)`, opacity: fadeIn * pulse * out }} />;
          }
          case 'flash':
            return <AbsoluteFill key={i} style={{ background: e.color ?? '#FFFFFF', opacity: interpolate(local, [0, life], [0.7, 0], clamp) }} />;
          default:
            return null;
        }
      })}
    </AbsoluteFill>
  );
};
