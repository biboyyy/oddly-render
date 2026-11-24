// GPS / relativity props for the cinematic engine (EP016 "GPS Bakal Ngaco Tanpa Einstein"),
// written generic enough to reuse: phone with a live map screen, GPS satellite (orbit, trail,
// signal pulses, floating tag), analog clock with keyed tick rate, signal rings, beams,
// a warped spacetime grid and a launch rocket. Pure functions of frame (no accumulated state).
// Three.js coords (Y up, metres); every `at`/`until` is a scene-local frame (pipeline resolves cues).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { DEG, Key, sample } from './tracks';
import { MedievalAttach } from './Medieval'; // ep019
import { UiPhone } from './MemsFx'; // ep018

const FONT = 'Montserrat, sans-serif';
const hr = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

// ------------------------------------------------------------------ city map (static base, seeded)
type Theme = 'light' | 'dark';
const PAL: Record<Theme, Record<string, string>> = {
  light: { bg: '#EDEFEA', block: '#E3E6E0', bld: '#D6DAD3', park: '#BFE3B4', water: '#A6D2F2', minor: '#FFFFFF', major: '#FFD36B', majorEdge: '#E3A73A', text: '#5F6773', water_t: '#4E8FC4' },
  dark: { bg: '#18202C', block: '#1F2837', bld: '#273246', park: '#1C3A2C', water: '#12314D', minor: '#34415A', major: '#D19A3A', majorEdge: '#8A6224', text: '#97A3B8', water_t: '#4E8FC4' },
};
const BASE: Record<string, HTMLCanvasElement> = {};
const MS = 2048;
function baseMap(theme: Theme, seed: number) {
  const key = theme + seed;
  if (BASE[key]) return BASE[key];
  const c = document.createElement('canvas'); c.width = c.height = MS;
  const g = c.getContext('2d')!; const P = PAL[theme];
  const r = (k: number) => hr(k * 13.7 + seed * 101.3);
  g.fillStyle = P.bg; g.fillRect(0, 0, MS, MS);
  // street grid (slightly irregular)
  const xs: number[] = [], ys: number[] = [];
  for (let x = 0, k = 0; x < MS + 200; k++) { xs.push(x); x += 95 + r(k) * 70; }
  for (let y = 0, k = 0; y < MS + 200; k++) { ys.push(y); y += 95 + r(k + 300) * 70; }
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
    const x0 = xs[i] + 9, y0 = ys[j] + 9, w = xs[i + 1] - xs[i] - 18, h = ys[j + 1] - ys[j] - 18;
    const q = r(i * 57 + j * 13 + 7);
    g.fillStyle = q > 0.9 ? P.park : P.block; g.fillRect(x0, y0, w, h);
    if (q <= 0.9) {
      g.fillStyle = P.bld;
      const n = 2 + Math.floor(r(i * 7 + j * 31) * 4);
      for (let b = 0; b < n; b++) {
        const bw = w * (0.22 + r(b + i * 3 + j * 11) * 0.3), bh = h * (0.22 + r(b * 5 + i + j * 7) * 0.3);
        g.fillRect(x0 + r(b * 9 + i + j) * (w - bw), y0 + r(b * 3 + i * 5 + j) * (h - bh), bw, bh);
      }
    }
  }
  // river
  g.strokeStyle = P.water; g.lineWidth = 110; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-100, MS * 0.7); g.bezierCurveTo(MS * 0.3, MS * 0.55, MS * 0.55, MS * 0.92, MS + 100, MS * 0.62); g.stroke();
  // minor roads
  g.strokeStyle = P.minor; g.lineWidth = 16; g.lineCap = 'butt';
  xs.forEach((x) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, MS); g.stroke(); });
  ys.forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(MS, y); g.stroke(); });
  // major roads
  const major = (pts: number[][]) => {
    for (const [col, lw] of [[P.majorEdge, 44], [P.major, 34]] as const) {
      g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * MS, y * MS) : g.moveTo(x * MS, y * MS))); g.stroke();
    }
  };
  major([[0, 0.32], [1, 0.29]]); major([[0.56, 0], [0.53, 1]]); major([[0.05, 1], [0.95, 0.02]]); major([[0, 0.83], [1, 0.8]]);
  // labels
  g.fillStyle = P.text; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lab = (t: string, x: number, y: number, rot = 0, size = 30, col = P.text) => {
    g.save(); g.translate(x * MS, y * MS); g.rotate(rot); g.font = `700 ${size}px ${FONT}`; g.fillStyle = col;
    g.strokeStyle = P.bg; g.lineWidth = 6; g.strokeText(t, 0, 0); g.fillText(t, 0, 0); g.restore();
  };
  lab('Jl. Sudirman', 0.28, 0.315, -0.03); lab('Jl. Thamrin', 0.545, 0.14, -Math.PI / 2 + 0.03);
  lab('Jl. Gatot Subroto', 0.72, 0.27, -0.84); lab('Jl. Rasuna Said', 0.8, 0.805, -0.03);
  lab('MENTENG', 0.3, 0.17, 0, 40); lab('KEMANG', 0.78, 0.55, 0, 40); lab('SENAYAN', 0.22, 0.5, 0, 40); lab('KUNINGAN', 0.8, 0.12, 0, 40);
  lab('Sungai Ciliwung', 0.36, 0.66, -0.25, 30, P.water_t);
  BASE[key] = c;
  return c;
}

export type MapSpec = { theme?: Theme; seed?: number; px?: number; aspect?: number; ui?: boolean; search?: string; keys?: Key[] };
const pinPath = (g: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) => {
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(0, 2 * s, 9 * s, 3.5 * s, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2 * s;
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-6 * s, -14 * s, -17 * s, -22 * s, -17 * s, -34 * s);
  g.arc(0, -34 * s, 17 * s, Math.PI, 0); g.bezierCurveTo(17 * s, -22 * s, 6 * s, -14 * s, 0, 0); g.fill(); g.stroke();
  g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(0, -34 * s, 6.5 * s, 0, Math.PI * 2); g.fill(); g.restore();
};
const pill = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rr: number) => {
  g.beginPath(); g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr); g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath();
};

/** per-frame map texture. keys: center [u,v], zoom (visible width as fraction of the map), truth [u,v] (blue dot),
 *  pin [u,v] (red/green marker), pinColor, pinOn 0..1, circle 0..1 (error circle around truth, radius = |pin-truth|),
 *  line 0..1 (dashed truth->pin + `dist` pill), dist (text), title/sub (bottom card text), tone ('#hex' card accent) */
export function useMapTexture(m: MapSpec, frame: number, fps: number) {
  const W = m.px ?? 540, H = Math.round(W * (m.aspect ?? 2.1));
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return { canvas: c, tex: t };
  }, [W, H]);
  const theme = m.theme ?? 'light'; const P = PAL[theme];
  const base = baseMap(theme, m.seed ?? 1);
  const K = m.keys;
  const center = sample<number[]>(K, 'center', frame, [0.5, 0.5]);
  const zoom = sample<number>(K, 'zoom', frame, 0.3);
  const truth = sample<number[] | null>(K, 'truth', frame, null);
  const pin = sample<number[] | null>(K, 'pin', frame, null);
  const pinOn = sample<number>(K, 'pinOn', frame, pin ? 1 : 0);
  const circle = sample<number>(K, 'circle', frame, 0);
  const line = sample<number>(K, 'line', frame, 0);
  const dist = sample<string>(K, 'dist', frame, '');
  const title = sample<string>(K, 'title', frame, '');
  const sub = sample<string>(K, 'sub', frame, '');
  const tone = sample<string>(K, 'tone', frame, '#1A73E8');
  const pinColor = sample<string>(K, 'pinColor', frame, '#EA4335');
  const g = canvas.getContext('2d')!;
  const sw = zoom * MS, sh = sw * H / W, sx = center[0] * MS - sw / 2, sy = center[1] * MS - sh / 2;
  g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
  g.drawImage(base, sx, sy, sw, sh, 0, 0, W, H);
  const k = W / 540;
  const toS = (uv: number[]) => [(uv[0] * MS - sx) / sw * W, (uv[1] * MS - sy) / sh * H];
  const t = frame / fps;
  if (truth && pin && circle > 0.01) {
    const [ax, ay] = toS(truth), [bx, by] = toS(pin); const R = Math.hypot(bx - ax, by - ay);
    g.fillStyle = `rgba(234,67,53,${0.16 * circle})`; g.strokeStyle = `rgba(234,67,53,${0.85 * circle})`; g.lineWidth = 4 * k;
    g.beginPath(); g.arc(ax, ay, R, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  if (truth && pin && line > 0.01) {
    const [ax, ay] = toS(truth), [bx, by] = toS(pin);
    g.save(); g.globalAlpha = line; g.setLineDash([16 * k, 12 * k]); g.strokeStyle = '#E8453C'; g.lineWidth = 7 * k;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.restore();
    if (dist) {
      g.save(); g.globalAlpha = line; g.font = `900 ${44 * k}px ${FONT}`; const tw = g.measureText(dist).width + 44 * k;
      const mx = (ax + bx) / 2, my = (ay + by) / 2 + 74 * k;
      g.fillStyle = '#E8453C'; pill(g, mx - tw / 2, my - 34 * k, tw, 68 * k, 34 * k); g.fill();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(dist, mx, my + 2 * k); g.restore();
    }
  }
  if (truth) {
    const [x, y] = toS(truth); const ph = (t * 0.8) % 1;
    g.fillStyle = `rgba(26,115,232,${0.35 * (1 - ph)})`; g.beginPath(); g.arc(x, y, (22 + ph * 50) * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(26,115,232,0.18)'; g.beginPath(); g.arc(x, y, 40 * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(x, y, 19 * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1A73E8'; g.beginPath(); g.arc(x, y, 13 * k, 0, Math.PI * 2); g.fill();
  }
  if (pin && pinOn > 0.01) {
    const [x, y] = toS(pin); g.save(); g.globalAlpha = Math.min(1, pinOn);
    pinPath(g, x, y, 1.9 * k * (0.6 + 0.4 * Math.min(1, pinOn)), pinColor); g.restore();
  }
  if (m.ui !== false) {
    // status bar + search pill
    g.fillStyle = 'rgba(0,0,0,0.0)';
    g.fillStyle = theme === 'light' ? '#1F2937' : '#E5E7EB'; g.font = `700 ${26 * k}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('12:00', 34 * k, 34 * k); g.textAlign = 'right'; g.fillText('5G  ▮▮▮', W - 34 * k, 34 * k);
    g.fillStyle = theme === 'light' ? '#FFFFFF' : '#2A3446'; g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 14 * k;
    pill(g, 26 * k, 66 * k, W - 52 * k, 84 * k, 42 * k); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#EA4335'; g.beginPath(); g.arc(70 * k, 108 * k, 14 * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme === 'light' ? '#6B7280' : '#AAB4C5'; g.font = `600 ${30 * k}px ${FONT}`; g.textAlign = 'left';
    g.fillText(m.search ?? 'Cari di sini', 104 * k, 109 * k);
    if (title) {
      const ch = (sub ? 190 : 140) * k, cy = H - ch - 30 * k;
      g.fillStyle = theme === 'light' ? '#FFFFFF' : '#222C3D'; g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 18 * k;
      pill(g, 22 * k, cy, W - 44 * k, ch, 34 * k); g.fill(); g.shadowBlur = 0;
      g.fillStyle = tone; pill(g, 22 * k, cy, 18 * k, ch, 9 * k); g.fill();
      g.fillStyle = tone; g.font = `900 ${50 * k}px ${FONT}`; g.textAlign = 'left';
      const tw = g.measureText(title).width; const fs = tw > W - 120 * k ? 50 * k * (W - 120 * k) / tw : 50 * k;
      g.font = `900 ${fs}px ${FONT}`; g.fillText(title, 62 * k, cy + (sub ? 64 : 70) * k);
      if (sub) { g.fillStyle = theme === 'light' ? '#4B5563' : '#C7CFDC'; g.font = `600 ${32 * k}px ${FONT}`; g.fillText(sub, 62 * k, cy + 130 * k); }
    }
  }
  tex.needsUpdate = true;
  return tex;
}

const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 4, r);

/** handheld phone with a live map screen (screen faces +z, long side +y) */
export type PhoneSpec = { type: 'phone'; id: string; size?: number[]; keys?: Key[]; light?: number; map: MapSpec };
export const Phone: React.FC<{ o: PhoneSpec }> = ({ o }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const [w, h] = o.size ?? [0.5, 1.05];
  const tex = useMapTexture({ aspect: (h * 0.955) / (w * 0.92), ...o.map }, frame, fps);
  const body = useMemo(() => rbox(w, h, w * 0.09, w * 0.08), [w, h]);
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const sc = sample<number>(o.keys, 'scale', frame, 1);
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={sc}>
      <mesh geometry={body} castShadow><meshStandardMaterial color="#15171d" metalness={0.5} roughness={0.35} /></mesh>
      <mesh position={[0, 0, w * 0.046]}><planeGeometry args={[w * 0.92, h * 0.955]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      <mesh position={[w * 0.22, h * 0.38, -w * 0.05]}><boxGeometry args={[w * 0.3, w * 0.3, w * 0.03]} /><meshStandardMaterial color="#2a2d36" roughness={0.3} /></mesh>
      {(o.light ?? 0) > 0 && <pointLight position={[0, 0, w * 0.9]} color="#d8ecff" intensity={o.light} distance={w * 8} decay={2} />}
    </group>
  );
};

// ------------------------------------------------------------------ analog clock
const clockFaces: Record<string, THREE.CanvasTexture> = {};
function clockFace(face: string, ink: string, label: string, accent: string) {
  const key = [face, ink, label, accent].join('|');
  if (clockFaces[key]) return clockFaces[key];
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
  g.fillStyle = face; g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
  const gr = g.createRadialGradient(256, 200, 40, 256, 256, 256); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = gr; g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
  g.strokeStyle = ink; g.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
    g.lineWidth = big ? 10 : 4; const r0 = big ? 196 : 214;
    g.beginPath(); g.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); g.lineTo(256 + Math.sin(a) * 236, 256 - Math.cos(a) * 236); g.stroke();
  }
  g.fillStyle = ink; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  [['12', 0], ['3', 90], ['6', 180], ['9', 270]].forEach(([t, d]) => { const a = (d as number) * DEG; g.fillText(t as string, 256 + Math.sin(a) * 150, 256 - Math.cos(a) * 150 + 4); });
  if (label) {
    g.font = `900 ${label.length > 7 ? 34 : 40}px ${FONT}`; const tw = g.measureText(label).width + 30;
    g.fillStyle = accent; pill(g, 256 - tw / 2, 318, tw, 54, 27); g.fill();
    g.fillStyle = '#FFFFFF'; g.fillText(label, 256, 346);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; clockFaces[key] = t; return t;
}
export type ClockSpec = { type: 'clock'; id: string; radius?: number; face?: string; ink?: string; rim?: string; accent?: string; label?: string;
  speed?: number; start?: number; glow?: number; keys?: Key[]; light?: number };
/** keys: pos, rot, scale, rate (tick-rate multiplier, integrated over frames), ring (accent ring glow) */
export const Clock: React.FC<{ o: ClockSpec }> = ({ o }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const R = o.radius ?? 1;
  const tex = clockFace(o.face ?? '#F7F3EA', o.ink ?? '#1B2333', o.label ?? '', o.accent ?? '#2E6BD6');
  let T = o.start ?? 36600;
  const speed = o.speed ?? 12;
  for (let f = 0; f < frame; f++) T += (speed * sample<number>(o.keys, 'rate', f, 1)) / fps;
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const sc = sample<number>(o.keys, 'scale', frame, 1);
  const ring = sample<number>(o.keys, 'ring', frame, 0.6);
  if (sc < 1e-3) return null;
  const hand = (ang: number, len: number, wd: number, col: string, z: number, tail = 0.12) => (
    <group rotation={[0, 0, -ang]} position={[0, 0, z]}>
      <mesh position={[0, (len - tail * R) / 2, 0]} castShadow><boxGeometry args={[wd, len + tail * R, R * 0.025]} /><meshStandardMaterial color={col} roughness={0.4} metalness={0.3} /></mesh>
    </group>
  );
  const sec = ((T % 60) / 60) * Math.PI * 2, min = ((T % 3600) / 3600) * Math.PI * 2, hrs = ((T % 43200) / 43200) * Math.PI * 2;
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={sc}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow><cylinderGeometry args={[R * 1.1, R * 1.14, R * 0.2, 64]} /><meshStandardMaterial color={o.rim ?? '#C9A24A'} metalness={0.75} roughness={0.3} /></mesh>
      <mesh position={[0, 0, R * 0.101]}><circleGeometry args={[R, 64]} /><meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={o.glow ?? 0.45} roughness={0.6} /></mesh>
      <mesh position={[0, 0, R * 0.105]}><ringGeometry args={[R * 1.0, R * 1.07, 64]} /><meshBasicMaterial color={o.accent ?? '#2E6BD6'} transparent opacity={Math.min(1, ring)} toneMapped={false} /></mesh>
      {hand(hrs, R * 0.5, R * 0.075, o.ink ?? '#1B2333', R * 0.13)}
      {hand(min, R * 0.78, R * 0.05, o.ink ?? '#1B2333', R * 0.15)}
      {hand(sec, R * 0.88, R * 0.022, '#E5484D', R * 0.17, 0.2)}
      <mesh position={[0, 0, R * 0.19]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[R * 0.06, R * 0.06, R * 0.04, 24]} /><meshStandardMaterial color="#E5484D" /></mesh>
      {(o.light ?? 0) > 0 && <pointLight position={[0, 0, R * 1.2]} color={o.accent ?? '#2E6BD6'} intensity={(o.light ?? 0) * (0.5 + ring * 0.5)} distance={R * 6} decay={2} />}
    </group>
  );
};

// ------------------------------------------------------------------ GPS satellite
let panelTex: THREE.CanvasTexture | null = null;
function solarTex() {
  if (panelTex) return panelTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d')!;
  g.fillStyle = '#C8CCD4'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
    const gr = g.createLinearGradient(0, j * 64, 0, j * 64 + 60); gr.addColorStop(0, '#2A4FA8'); gr.addColorStop(1, '#14275E');
    g.fillStyle = gr; g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
    g.strokeStyle = 'rgba(160,190,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(i * 64 + 32, j * 64 + 3); g.lineTo(i * 64 + 32, j * 64 + 61); g.stroke();
  }
  panelTex = new THREE.CanvasTexture(c); panelTex.colorSpace = THREE.SRGBColorSpace; return panelTex;
}
const tagTexCache: Record<string, THREE.CanvasTexture> = {};
function tagTex(text: string, color: string) {
  const key = text + color; if (tagTexCache[key]) return tagTexCache[key];
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d')!;
  const lines = text.split('\n');
  g.font = `900 92px ${FONT}`; const w = Math.min(1000, Math.max(...lines.map((l) => g.measureText(l).width)) + 90); const h = lines.length * 112 + 60;
  const x = (1024 - w) / 2, y = (512 - h) / 2;
  g.fillStyle = 'rgba(12,20,40,0.88)'; pill(g, x, y, w, h, 46); g.fill(); g.lineWidth = 10; g.strokeStyle = color; pill(g, x, y, w, h, 46); g.stroke();
  g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.fillStyle = i === 0 ? color : '#FFFFFF'; g.fillText(l, 512, y + 30 + 56 + i * 112); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; tagTexCache[key] = t; return t;
}
export type SatSpec = { type: 'gpssat'; id: string; keys?: Key[]; scale?: number;
  orbit?: { center?: number[]; radius: number; speed: number; phase?: number; tilt?: number; yaw?: number };
  face?: number[]; trail?: number; trailColor?: string;
  pulse?: { at?: number; until?: number; period?: number; radius?: number; color?: string };
  tag?: { text: string; at?: number; until?: number; color?: string; size?: number; dy?: number }; glow?: number };
function satPos(o: SatSpec, f: number, fps: number): THREE.Vector3 {
  if (o.orbit) {
    const ob = o.orbit; const a = ((ob.phase ?? 0) + ob.speed * (f / fps)) * DEG;
    const v = new THREE.Vector3(Math.cos(a) * ob.radius, 0, Math.sin(a) * ob.radius);
    v.applyAxisAngle(new THREE.Vector3(1, 0, 0), (ob.tilt ?? 0) * DEG).applyAxisAngle(new THREE.Vector3(0, 1, 0), (ob.yaw ?? 0) * DEG);
    const c = ob.center ?? [0, 0, 0]; return v.add(new THREE.Vector3(c[0], c[1], c[2]));
  }
  const p = sample<number[]>(o.keys, 'pos', f, [0, 0, 0]); return new THREE.Vector3(p[0], p[1], p[2]);
}
export const GpsSat: React.FC<{ o: SatSpec }> = ({ o }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const S = (o.scale ?? 1) * sample<number>(o.keys, 'scale', frame, 1);
  const p = satPos(o, frame, fps);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const target = o.face ?? o.orbit?.center ?? null;
  if (target) {
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(target[0], target[1], target[2]), p, new THREE.Vector3(0, 1, 0));
    q.setFromRotationMatrix(m);
  } else { const r = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]); q.setFromEuler(new THREE.Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG)); }
  const spin = sample<number>(o.keys, 'spin', frame, 0);
  const sol = solarTex();
  const blink = Math.floor(frame / 12) % 3 === 0 ? 1 : 0.1;
  // trail
  const trail = o.trail ?? 0;
  const trailGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(64 * 3), 3)); return g; }, []);
  if (trail > 0) {
    const pa = trailGeo.attributes.position.array as Float32Array, ca = trailGeo.attributes.color.array as Float32Array;
    const col = new THREE.Color(o.trailColor ?? '#8fd3ff');
    for (let k = 0; k < 64; k++) {
      const v = satPos(o, frame - (k / 63) * trail * fps, fps); pa.set([v.x, v.y, v.z], k * 3);
      const fade = Math.pow(1 - k / 63, 1.6); ca.set([col.r * fade, col.g * fade, col.b * fade], k * 3);
    }
    trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
  }
  const trailLine = useMemo(() => new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })), [trailGeo]);
  const bodyGeo = useMemo(() => rbox(0.9, 0.9, 1.2, 0.05), []);
  const pu = o.pulse; const t = frame / fps;
  const tg = o.tag; const tagA = tg ? Math.max(0, Math.min(1, (frame - (tg.at ?? 0)) / 8)) * (frame >= (tg.until ?? 1e9) ? Math.max(0, 1 - (frame - (tg.until ?? 0)) / 6) : 1) : 0;
  const gold = <meshStandardMaterial color="#D8A848" metalness={0.55} roughness={0.32} emissive="#4a3005" emissiveIntensity={o.glow ?? 0.35} />;
  return (
    <>
      {trail > 0 && <primitive object={trailLine} frustumCulled={false} />}
      <group position={p}>
        <group quaternion={q} scale={S}>
          <group rotation={[0, 0, spin * DEG]}>
            <mesh castShadow receiveShadow geometry={bodyGeo}>{gold}</mesh>
            <mesh position={[0, 0.47, 0]}><boxGeometry args={[0.6, 0.06, 0.8]} /><meshStandardMaterial color="#e8e8ec" metalness={0.3} roughness={0.5} /></mesh>
            {/* nadir antenna array (faces +z = toward Earth) */}
            <mesh position={[0, 0, 0.62]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.36, 0.36, 0.05, 32]} /><meshStandardMaterial color="#F2F2F2" roughness={0.6} /></mesh>
            {Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * Math.PI * 2, rr = k % 2 ? 0.27 : 0.16;
              return <mesh key={k} position={[Math.cos(a) * rr, Math.sin(a) * rr, 0.72]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.16, 10]} /><meshStandardMaterial color="#dcdcdc" /></mesh>; })}
            {[-1, 1].map((sd) => (
              <group key={sd}>
                <mesh position={[sd * 0.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 0.6, 8]} /><meshStandardMaterial color="#bbbbbb" metalness={0.6} roughness={0.4} /></mesh>
                {[0, 1].map((j) => (
                  <mesh key={j} position={[sd * (1.25 + j * 1.02), 0, 0]} castShadow>
                    <boxGeometry args={[1.0, 1.5, 0.035]} />
                    <meshStandardMaterial map={sol} emissiveMap={sol} emissive="#3a5cff" emissiveIntensity={0.25} metalness={0.4} roughness={0.35} />
                  </mesh>
                ))}
              </group>
            ))}
            <mesh position={[0.3, 0.52, -0.4]}><sphereGeometry args={[0.05, 10, 8]} /><meshBasicMaterial color={blink > 0.5 ? '#ff4040' : '#401010'} toneMapped={false} /></mesh>
            {pu && frame >= (pu.at ?? 0) && frame < (pu.until ?? 1e9) && Array.from({ length: 3 }, (_, k) => {
              const life = (((t - (pu.at ?? 0) / fps) / (pu.period ?? 1.1) + k / 3) % 1 + 1) % 1; const R = 0.3 + life * (pu.radius ?? 3);
              return <mesh key={k} position={[0, 0, 0.75 + life * (pu.radius ?? 3) * 0.7]} scale={R}><ringGeometry args={[0.9, 1, 48]} /><meshBasicMaterial color={pu.color ?? '#7fe0ff'} transparent opacity={0.8 * (1 - life)} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>;
            })}
          </group>
        </group>
        {tg && tagA > 0.01 && (
          <sprite position={[0, (tg.dy ?? 1.6) * S, 0]} scale={[(tg.size ?? 2.4) * S * (0.7 + 0.3 * tagA), (tg.size ?? 2.4) * 0.5 * S * (0.7 + 0.3 * tagA), 1]}>
            <spriteMaterial map={tagTex(tg.text, tg.color ?? '#FFD447')} transparent opacity={tagA} depthWrite={false} toneMapped={false} />
          </sprite>
        )}
      </group>
    </>
  );
};

// ------------------------------------------------------------------ signal beam between two points
export type BeamSpec = { type: 'beam'; id: string; from: number[]; to: number[]; color?: string; at?: number; grow?: number; until?: number; width?: number; pulses?: number; speed?: number; opacity?: number };
export const Beam: React.FC<{ o: BeamSpec }> = ({ o }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const a = new THREE.Vector3(...(o.from as [number, number, number])), b = new THREE.Vector3(...(o.to as [number, number, number]));
  const at = o.at ?? 0; if (frame < at) return null;
  const out = o.until !== undefined && frame > o.until ? Math.max(0, 1 - (frame - o.until) / 8) : 1; if (out <= 0) return null;
  const g = Math.min(1, (frame - at) / Math.max(1, o.grow ?? 15));
  const dir = b.clone().sub(a); const L = dir.length() * g; dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const mid = a.clone().add(dir.clone().multiplyScalar(L / 2));
  const col = o.color ?? '#7fe0ff'; const W = o.width ?? 0.05; const op = (o.opacity ?? 0.55) * out;
  const n = o.pulses ?? 4, sp = o.speed ?? 0.8, t = (frame - at) / fps;
  return (
    <group>
      <mesh position={mid} quaternion={q}><cylinderGeometry args={[W, W, L, 10, 1, true]} /><meshBasicMaterial color={col} transparent opacity={op} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      <mesh position={mid} quaternion={q}><cylinderGeometry args={[W * 3, W * 3, L, 10, 1, true]} /><meshBasicMaterial color={col} transparent opacity={op * 0.25} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      {g >= 1 && Array.from({ length: n }, (_, k) => {
        const u = ((t * sp + k / n) % 1); const p = a.clone().lerp(b, u);
        return <mesh key={k} position={p}><sphereGeometry args={[W * 3.2, 12, 10]} /><meshBasicMaterial color="#ffffff" transparent opacity={out * Math.sin(Math.PI * u)} toneMapped={false} /></mesh>;
      })}
    </group>
  );
};

// ------------------------------------------------------------------ expanding signal rings at a point
export type RingsSpec = { type: 'rings'; id: string; pos: number[]; dir?: number[]; color?: string; count?: number; period?: number; radius?: number; at?: number; until?: number; opacity?: number; width?: number };
export const Rings: React.FC<{ o: RingsSpec }> = ({ o }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const at = o.at ?? 0; if (frame < at || frame > (o.until ?? 1e9)) return null;
  const nrm = new THREE.Vector3(...((o.dir ?? [0, 1, 0]) as [number, number, number])).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
  const n = o.count ?? 3, t = (frame - at) / fps;
  return (
    <group position={o.pos as any} quaternion={q}>
      {Array.from({ length: n }, (_, k) => {
        const life = ((t / (o.period ?? 1.2) + k / n) % 1); const R = 0.05 + life * (o.radius ?? 2);
        return <mesh key={k} scale={R}><ringGeometry args={[1 - (o.width ?? 0.08), 1, 64]} /><meshBasicMaterial color={o.color ?? '#7fe0ff'} transparent opacity={(o.opacity ?? 0.85) * (1 - life)} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>;
      })}
    </group>
  );
};

// ------------------------------------------------------------------ warped spacetime grid (gravity well)
export type WarpSpec = { type: 'warpgrid'; id: string; pos?: number[]; size?: number; lines?: number; sigma?: number; color?: string; opacity?: number; keys?: Key[]; seg?: number };
export const WarpGrid: React.FC<{ o: WarpSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const size = o.size ?? 40, seg = o.seg ?? 120, sig = o.sigma ?? 4;
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2); return g; }, [size, seg]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(o.color ?? '#6fd0ff') }, n: { value: o.lines ?? 30 }, op: { value: o.opacity ?? 0.9 } },
    vertexShader: 'varying vec2 vUv; varying float vD; void main(){ vUv = uv; vD = position.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 c; uniform float n; uniform float op; varying vec2 vUv; varying float vD;
      void main(){ vec2 g = fract(vUv*n); vec2 d = min(g, 1.0-g); float m = min(d.x, d.y);
        float line = smoothstep(0.075, 0.0, m); float glow = smoothstep(0.3, 0.0, m)*0.18;
        float edge = smoothstep(0.5, 0.36, length(vUv-0.5));
        float deep = clamp(-vD*0.12, 0.0, 1.0);
        vec3 col = mix(c, vec3(1.0,0.55,0.95), deep*0.6);
        gl_FragColor = vec4(col*(line+glow), (line+glow)*op*edge); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), [o.color, o.lines, o.opacity]);
  const depth = sample<number>(o.keys, 'depth', frame, 4);
  const arr = geo.attributes.position.array as Float32Array;
  for (let i = 0; i < arr.length; i += 3) {
    const x = base[i], z = base[i + 2]; const r2 = (x * x + z * z) / (sig * sig);
    arr[i + 1] = -depth / (1 + r2);
  }
  geo.attributes.position.needsUpdate = true;
  const pos = sample<number[]>(o.keys, 'pos', frame, o.pos ?? [0, 0, 0]);
  return <mesh geometry={geo} material={mat} position={pos as any} frustumCulled={false} />;
};

// ------------------------------------------------------------------ launch rocket (procedural)
export type RocketSpec = { type: 'rocket'; id: string; height?: number; keys?: Key[]; color?: string; band?: string; label?: string };
export const Rocket: React.FC<{ o: RocketSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const H = o.height ?? 12, r = H * 0.045;
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const white = <meshStandardMaterial color={o.color ?? '#F2F2EE'} roughness={0.45} metalness={0.1} />;
  const dark = <meshStandardMaterial color={o.band ?? '#22252c'} roughness={0.5} metalness={0.2} />;
  const labTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const g = c.getContext('2d')!;
    g.fillStyle = o.color ?? '#F2F2EE'; g.fillRect(0, 0, 256, 1024);
    g.save(); g.translate(128, 512); g.rotate(-Math.PI / 2); g.fillStyle = '#1B2a55'; g.font = `900 150px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(o.label ?? 'GPS III', 0, 0); g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [o.label, o.color]);
  const y1 = H * 0.55, y2 = H * 0.25, yF = H * 0.2;
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]}>
      {/* first stage */}
      <mesh position={[0, H * 0.04 + y1 / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[r, r, y1, 40]} />{white}</mesh>
      <mesh position={[0, H * 0.04 + y1 * 0.55, r * 1.001]} ><planeGeometry args={[r * 1.2, y1 * 0.6]} /><meshStandardMaterial map={labTex} roughness={0.5} /></mesh>
      <mesh position={[0, H * 0.04 + y1 + 0.02, 0]} castShadow><cylinderGeometry args={[r * 1.01, r * 1.01, H * 0.03, 40]} />{dark}</mesh>
      {/* second stage + fairing */}
      <mesh position={[0, H * 0.07 + y1 + y2 / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[r, r, y2, 40]} />{white}</mesh>
      <mesh position={[0, H * 0.07 + y1 + y2 + yF * 0.25, 0]} castShadow><cylinderGeometry args={[r * 1.15, r, yF * 0.5, 40]} />{white}</mesh>
      <mesh position={[0, H * 0.07 + y1 + y2 + yF * 0.5 + yF * 0.35, 0]} castShadow><coneGeometry args={[r * 1.15, yF * 0.7, 40]} />{white}</mesh>
      {/* engines + fins + boosters */}
      <mesh position={[0, H * 0.02, 0]}><cylinderGeometry args={[r * 0.6, r * 0.95, H * 0.05, 24, 1, true]} /><meshStandardMaterial color="#3a3a3e" metalness={0.8} roughness={0.35} side={THREE.DoubleSide} /></mesh>
      {[0, 90, 180, 270].map((d) => (
        <mesh key={d} position={[Math.sin(d * DEG) * r * 1.3, H * 0.09, Math.cos(d * DEG) * r * 1.3]} rotation={[0, d * DEG, 0]} castShadow><boxGeometry args={[r * 0.08, H * 0.1, r * 0.7]} />{dark}</mesh>
      ))}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * r * 1.75, 0, 0]}>
          <mesh position={[0, H * 0.04 + H * 0.17, 0]} castShadow receiveShadow><cylinderGeometry args={[r * 0.55, r * 0.55, H * 0.34, 24]} />{white}</mesh>
          <mesh position={[0, H * 0.04 + H * 0.34 + H * 0.035, 0]} castShadow><coneGeometry args={[r * 0.55, H * 0.07, 24]} />{white}</mesh>
          <mesh position={[0, H * 0.02, 0]}><cylinderGeometry args={[r * 0.35, r * 0.5, H * 0.04, 16, 1, true]} /><meshStandardMaterial color="#3a3a3e" metalness={0.8} roughness={0.35} side={THREE.DoubleSide} /></mesh>
        </group>
      ))}
    </group>
  );
};

// ------------------------------------------------------------------ orbit path (thin glowing torus)
export type OrbitLineSpec = { type: 'orbitline'; id: string; center?: number[]; radius: number; tilt?: number; yaw?: number; color?: string; opacity?: number; tube?: number };
export const OrbitLine: React.FC<{ o: OrbitLineSpec }> = ({ o }) => {
  const c = o.center ?? [0, 0, 0];
  // same frame as GpsSat orbit: circle in XZ, tilted about X then yawed about Y
  return (
    <group position={c as any} rotation={[0, (o.yaw ?? 0) * DEG, 0]}>
      <group rotation={[(o.tilt ?? 0) * DEG, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[o.radius, o.tube ?? 0.02, 6, 160]} /><meshBasicMaterial color={o.color ?? '#7fe0ff'} transparent opacity={o.opacity ?? 0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      </group>
    </group>
  );
};

/** 3D map pin marker (red teardrop on a stick), keys: pos, scale, color via `color` */
export type PinSpec = { type: 'mappin'; id: string; keys?: Key[]; color?: string; size?: number };
export const MapPin: React.FC<{ o: PinSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const sc = sample<number>(o.keys, 'scale', frame, 1) * (o.size ?? 1);
  const col = sample<string>(o.keys, 'color', frame, o.color ?? '#EA4335');
  if (sc < 1e-3) return null;
  const bob = Math.sin(frame / 9) * 0.06;
  return (
    <group position={[pos[0], pos[1] + bob * sc, pos[2]]} scale={sc}>
      <mesh position={[0, 1.55, 0]} castShadow><sphereGeometry args={[0.55, 32, 24]} /><meshStandardMaterial color={col} roughness={0.35} emissive={col} emissiveIntensity={0.25} /></mesh>
      <mesh position={[0, 0.75, 0]} rotation={[Math.PI, 0, 0]} castShadow><coneGeometry args={[0.47, 1.3, 32]} /><meshStandardMaterial color={col} roughness={0.35} emissive={col} emissiveIntensity={0.25} /></mesh>
      <mesh position={[0, 1.6, 0.42]}><sphereGeometry args={[0.2, 20, 16]} /><meshStandardMaterial color="#ffffff" roughness={0.4} /></mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.45, 32]} /><meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} /></mesh>
    </group>
  );
};

/** small object attached to a toon hand (Cast attach `obj`): phone or clock */
export const AttachObj: React.FC<{ o: any }> = ({ o }) => {
  if (o.type === 'phone') return <Phone o={o} />;
  if (o.type === 'clock') return <Clock o={o} />;
  if (['bucket', 'helm', 'banner', 'shieldprop'].includes(o.type)) return <MedievalAttach o={o} />; // ep019
  if (o.type === 'uiphone') return <UiPhone o={o} />; // ep018
  return null;
};
