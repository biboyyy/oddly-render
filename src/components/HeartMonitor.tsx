import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONT } from '../theme';
import { clamp } from '../utils/anim';

export type MonitorKey = { at: number; bpm: number; sys: number; dia: number; state?: 'normal' | 'warning' | 'critical' };
export type MonitorCfg = { keys: MonitorKey[]; at?: number; until?: number; x?: number; y?: number };

const lerpKey = (keys: MonitorKey[], f: number) => {
  let a = keys[0];
  let b = keys[0];
  for (const k of keys) {
    if (k.at <= f) a = k;
    if (k.at > f) { b = k; break; }
    b = k;
  }
  if (a === b || b.at <= a.at) return { ...a };
  const t = Math.max(0, Math.min(1, (f - a.at) / Math.min(45, b.at - a.at)));
  return { bpm: a.bpm + (b.bpm - a.bpm) * t, sys: a.sys + (b.sys - a.sys) * t, dia: a.dia + (b.dia - a.dia) * t, state: t > 0.5 ? b.state : a.state, at: f };
};

/** Patient monitor overlay: scrolling ECG + BPM + blood pressure. Values are
 *  keyframed in the storyboard so the numbers tell the story. */
export const HeartMonitor: React.FC<{ cfg: MonitorCfg }> = ({ cfg }) => {
  const f = useCurrentFrame();
  const at = cfg.at ?? 0;
  const until = cfg.until ?? 1e9;
  if (f < at || f >= until) return null;
  const v = lerpKey(cfg.keys, f);
  const color = v.state === 'critical' ? COLORS.red : v.state === 'warning' ? COLORS.yellow : '#5BE59B';
  const W = 420, H = 110;
  // integrate phase deterministically from the key-framed bpm
  let phase = 0;
  for (let k = at; k < f; k++) phase += lerpKey(cfg.keys, k).bpm / 60 / 30;
  const pts: string[] = [];
  const beatsOnScreen = 3.2;
  for (let i = 0; i <= 140; i++) {
    const x = (i / 140) * W;
    const p = phase - beatsOnScreen * (1 - i / 140);
    const u = ((p % 1) + 1) % 1;
    let y = 0;
    if (u > 0.1 && u < 0.14) y = -10 * Math.sin(((u - 0.1) / 0.04) * Math.PI);
    if (u > 0.18 && u < 0.2) y = 10 * ((u - 0.18) / 0.02);
    if (u >= 0.2 && u < 0.23) y = 10 - 70 * ((u - 0.2) / 0.03);
    if (u >= 0.23 && u < 0.26) y = -60 + 75 * ((u - 0.23) / 0.03);
    if (u >= 0.26 && u < 0.28) y = 15 - 15 * ((u - 0.26) / 0.02);
    if (u > 0.4 && u < 0.55) y = -16 * Math.sin(((u - 0.4) / 0.15) * Math.PI);
    pts.push(`${x.toFixed(1)},${(H / 2 + 10 + y).toFixed(1)}`);
  }
  const blink = v.state === 'critical' ? 0.55 + 0.45 * Math.abs(Math.sin(f / 5)) : 1;
  const enter = interpolate(f - at, [0, 8], [0, 1], clamp) * interpolate(f, [until - 6, until], [1, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: cfg.x ?? 600, top: cfg.y ?? 250, width: W + 40, opacity: enter, transform: `translateY(${(1 - enter) * -30}px)`, fontFamily: FONT }}>
      <div style={{ background: 'rgba(10,18,36,0.92)', border: `4px solid ${color}`, borderRadius: 22, padding: '12px 20px 14px', boxShadow: `0 0 30px ${color}55, 0 10px 0 rgba(16,27,50,0.5)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: COLORS.white }}>
          <span style={{ fontWeight: 900, fontSize: 26, letterSpacing: 2, color, opacity: blink }}>♥ {Math.round(v.bpm)} <span style={{ fontSize: 18 }}>BPM</span></span>
          <span style={{ fontWeight: 900, fontSize: 26, color, opacity: blink }}>{Math.round(v.sys)}/{Math.round(v.dia)} <span style={{ fontSize: 16 }}>mmHg</span></span>
        </div>
        <svg width={W} height={H} style={{ display: 'block', marginTop: 4 }}>
          {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} stroke="rgba(127,200,255,0.12)" strokeWidth={2} />)}
          <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={W} cy={+pts[pts.length - 1].split(',')[1]} r={7} fill={COLORS.white} />
        </svg>
      </div>
    </div>
  );
};
