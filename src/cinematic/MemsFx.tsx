// MEMS accelerometer props for the cinematic engine (EP018 "Pegas Sekecil Debu di HP-mu"), generic enough to reuse:
//  - uiphone: phone with a live UI screen (video player that rotates portrait->landscape, step counter, fall alert, home),
//             x-ray mode (transparent shell revealing the logic board + a glowing accelerometer chip)
//  - mems:    macro MEMS die: proof mass with etch holes on serpentine springs, interdigitated comb fingers,
//             gap "charge" glow (1/gap), bond pads + gold wires, keyed displacement / oscillation / tilt
//  - hair:    giant hair strand (cuticle texture) for scale comparisons
//  - arrow3:  glowing 3D arrow (gravity, axes)
//  - tag:     camera-facing text billboard ({n} = keyed counter)
//  - graph:   readout panel (scrolling capacitance trace + sample dots + counter)
// Pure functions of frame. Three.js coords (Y up). `at`/`until` are scene-local frames (pipeline resolves cues).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { DEG, Key, sample } from './tracks';

const FONT = 'Montserrat, sans-serif';
const hr = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const fmtID = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const useCanvasTex = (w: number, h: number) => useMemo(() => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { c, t };
}, [w, h]);

// ================================================================== UI phone
type App = 'video' | 'steps' | 'fall' | 'home';
function drawVideoFrame(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
  // little animated "sunset beach" clip
  const sky = g.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, '#FF7A59'); sky.addColorStop(0.55, '#FFC46B'); sky.addColorStop(0.56, '#2E8BC0'); sky.addColorStop(1, '#145DA0');
  g.save(); rr(g, x, y, w, h, Math.min(w, h) * 0.04); g.clip();
  g.fillStyle = sky; g.fillRect(x, y, w, h);
  g.fillStyle = '#FFF2C4'; g.beginPath(); g.arc(x + w * 0.62, y + h * 0.5, h * 0.16, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#5B3A6B'; g.beginPath(); g.moveTo(x, y + h * 0.56); g.lineTo(x + w * 0.22, y + h * 0.3); g.lineTo(x + w * 0.45, y + h * 0.56); g.fill();
  g.fillStyle = '#7A4A7E'; g.beginPath(); g.moveTo(x + w * 0.25, y + h * 0.56); g.lineTo(x + w * 0.4, y + h * 0.38); g.lineTo(x + w * 0.58, y + h * 0.56); g.fill();
  for (let k = 0; k < 5; k++) { // waves
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1, h * 0.012); g.beginPath();
    const yy = y + h * (0.64 + k * 0.07); for (let i = 0; i <= 20; i++) { const xx = x + (i / 20) * w; const v = yy + Math.sin(i * 0.9 + t * 3 + k) * h * 0.012; i ? g.lineTo(xx, v) : g.moveTo(xx, v); } g.stroke();
  }
  // surfer / boat
  const bx = x + w * (0.2 + ((t * 0.08) % 0.7)); g.fillStyle = '#222'; g.fillRect(bx, y + h * 0.6, w * 0.08, h * 0.025); g.fillRect(bx + w * 0.035, y + h * 0.52, w * 0.008, h * 0.08);
  g.restore();
}
function drawPhoneUI(g: CanvasRenderingContext2D, W: number, H: number, app: App, steps: number, t: number, frame: number) {
  const k = Math.min(W, H) / 540;
  const status = (dark = true) => {
    g.fillStyle = dark ? '#E5E7EB' : '#111827'; g.font = `700 ${24 * k}px ${FONT}`; g.textBaseline = 'middle';
    g.textAlign = 'left'; g.fillText('19:42', 30 * k, 30 * k); g.textAlign = 'right'; g.fillText('5G ▮▮▮ 87%', W - 30 * k, 30 * k);
  };
  if (app === 'video') {
    g.fillStyle = '#0E1117'; g.fillRect(0, 0, W, H);
    const land = W > H;
    if (land) {
      drawVideoFrame(g, 0, 0, W, H, t);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, H - 52 * k, W, 52 * k);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(60 * k, H - 28 * k, W - 120 * k, 6 * k);
      g.fillStyle = '#FF3B3B'; g.fillRect(60 * k, H - 28 * k, (W - 120 * k) * (0.32 + (t * 0.02) % 0.5), 6 * k);
      g.beginPath(); g.arc(60 * k + (W - 120 * k) * (0.32 + (t * 0.02) % 0.5), H - 25 * k, 11 * k, 0, Math.PI * 2); g.fill();
    } else {
      status();
      const vh = W * 9 / 16; drawVideoFrame(g, 0, 70 * k, W, vh, t);
      g.fillStyle = '#FF3B3B'; g.fillRect(0, 70 * k + vh - 6 * k, W * 0.35, 6 * k);
      g.fillStyle = '#F3F4F6'; g.font = `800 ${34 * k}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('Senja di Pantai', 26 * k, 70 * k + vh + 56 * k);
      g.fillStyle = '#9CA3AF'; g.font = `600 ${24 * k}px ${FONT}`; g.fillText('1,2 jt x ditonton', 26 * k, 70 * k + vh + 92 * k);
      for (let i = 0; i < 4; i++) {
        const y0 = 70 * k + vh + 130 * k + i * 170 * k; if (y0 > H) break;
        const cols = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899'];
        g.fillStyle = cols[i]; rr(g, 22 * k, y0, 220 * k, 124 * k, 14 * k); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.moveTo(118 * k, y0 + 42 * k); g.lineTo(150 * k, y0 + 62 * k); g.lineTo(118 * k, y0 + 82 * k); g.fill();
        g.fillStyle = '#E5E7EB'; rr(g, 262 * k, y0 + 18 * k, W - 300 * k, 20 * k, 8 * k); g.fill();
        g.fillStyle = '#6B7280'; rr(g, 262 * k, y0 + 54 * k, (W - 300 * k) * 0.6, 16 * k, 8 * k); g.fill();
      }
    }
  } else if (app === 'steps') {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0B3D2E'); gr.addColorStop(1, '#06231B'); g.fillStyle = gr; g.fillRect(0, 0, W, H); status();
    const cx = W / 2, cy = H * 0.4, R = W * 0.36;
    g.lineWidth = 34 * k; g.strokeStyle = 'rgba(91,229,155,0.18)'; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#5BE59B'; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(0.97, steps / 10000)); g.stroke();
    g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${110 * k}px ${FONT}`; g.fillText(fmtID(steps), cx, cy - 6 * k);
    g.fillStyle = '#5BE59B'; g.font = `800 ${38 * k}px ${FONT}`; g.fillText('LANGKAH', cx, cy + 82 * k);
    g.fillStyle = '#A7F3D0'; g.font = `700 ${30 * k}px ${FONT}`; g.fillText(`${(steps * 0.00075).toFixed(1).replace('.', ',')} km  •  ${Math.round(steps * 0.04)} kkal`, cx, H * 0.72);
    // footprints
    for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(91,229,155,${0.25 + 0.18 * ((i + Math.floor(frame / 8)) % 4 === 0 ? 3 : 0)})`; g.beginPath(); g.ellipse(cx + (i % 2 ? 40 : -40) * k, H * 0.86 - i * 0 * k - (i * 30 * k), 18 * k, 30 * k, 0, 0, Math.PI * 2); g.fill(); }
  } else if (app === 'fall') {
    const p = 0.5 + 0.5 * Math.sin(t * 9);
    g.fillStyle = `rgb(${Math.round(150 + 60 * p)},20,30)`; g.fillRect(0, 0, W, H); status();
    const cx = W / 2, cy = H * 0.33;
    g.fillStyle = '#FFD447'; g.beginPath(); g.moveTo(cx, cy - 110 * k); g.lineTo(cx + 120 * k, cy + 95 * k); g.lineTo(cx - 120 * k, cy + 95 * k); g.closePath(); g.fill();
    g.fillStyle = '#7A0A12'; g.font = `900 ${150 * k}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', cx, cy + 22 * k);
    g.fillStyle = '#FFFFFF'; g.font = `900 ${60 * k}px ${FONT}`; g.fillText('JATUH', cx, H * 0.56); g.fillText('TERDETEKSI', cx, H * 0.62);
    g.font = `700 ${30 * k}px ${FONT}`; g.fillStyle = '#FFE4E6'; g.fillText('Data aman tersimpan', cx, H * 0.7);
    g.fillStyle = 'rgba(255,255,255,0.92)'; rr(g, W * 0.15, H * 0.8, W * 0.7, 90 * k, 45 * k); g.fill();
    g.fillStyle = '#B91C1C'; g.font = `900 ${36 * k}px ${FONT}`; g.fillText('SAYA OKE', cx, H * 0.8 + 46 * k);
  } else {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#3B2A7A'); gr.addColorStop(1, '#0F5C8A'); g.fillStyle = gr; g.fillRect(0, 0, W, H); status();
    g.fillStyle = '#fff'; g.font = `800 ${110 * k}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('19:42', W / 2, H * 0.2);
    const cols = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#2DD4BF', '#FB923C'];
    for (let i = 0; i < 16; i++) { const cx = W * (0.17 + (i % 4) * 0.22), cy = H * (0.42 + Math.floor(i / 4) * 0.12); g.fillStyle = cols[i % 8]; rr(g, cx - 46 * k, cy - 46 * k, 92 * k, 92 * k, 24 * k); g.fill(); }
  }
}
let pcbTex: THREE.CanvasTexture | null = null;
function boardTex() {
  if (pcbTex) return pcbTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const g = c.getContext('2d')!;
  g.fillStyle = '#0E3B2E'; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 140; i++) {
    g.strokeStyle = `rgba(${200 + hr(i) * 55},${170 + hr(i + 1) * 60},90,${0.35 + hr(i + 2) * 0.35})`; g.lineWidth = 2 + hr(i + 3) * 3;
    let x = hr(i + 4) * 512, y = hr(i + 5) * 1024; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 4; s++) { if ((s + i) % 2) x += (hr(i * 7 + s) - 0.5) * 220; else y += (hr(i * 5 + s) - 0.5) * 260; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(230,200,110,0.8)'; g.beginPath(); g.arc(hr(i * 3.1) * 512, hr(i * 1.7) * 1024, 2.5 + hr(i) * 2, 0, Math.PI * 2); g.fill(); }
  pcbTex = new THREE.CanvasTexture(c); pcbTex.colorSpace = THREE.SRGBColorSpace; return pcbTex;
}
export type UiPhoneSpec = { type: 'uiphone'; id: string; size?: number[]; keys?: Key[]; light?: number; chipPos?: number[]; dir?: number; px?: number };
/** keys: pos, rot, scale, orient 0..1 (UI portrait->landscape), app, steps, xray 0..1, chip 0..1 (accelerometer glow) */
export const UiPhone: React.FC<{ o: UiPhoneSpec }> = ({ o }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const [w, h] = o.size ?? [0.075, 0.158];
  const PX = o.px ?? 540; const PH = Math.round(PX * (h * 0.955) / (w * 0.92));
  const { c, t: tex } = useCanvasTex(PX, PH);
  const body = useMemo(() => new RoundedBoxGeometry(w, h, w * 0.1, 4, w * 0.09), [w, h]);
  const K = o.keys;
  const pos = sample<number[]>(K, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(K, 'rot', frame, [0, 0, 0]);
  const sc = sample<number>(K, 'scale', frame, 1);
  const orient = clamp01(sample<number>(K, 'orient', frame, 0));
  const app = sample<App>(K, 'app', frame, 'video');
  const steps = sample<number>(K, 'steps', frame, 0);
  const xray = clamp01(sample<number>(K, 'xray', frame, 0));
  const chip = sample<number>(K, 'chip', frame, 0);
  const t = frame / fps;
  // ---- screen canvas (content rotated by orient)
  const g = c.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, PX, PH);
  const th = orient * Math.PI / 2; const land = orient >= 0.5;
  const lw = land ? PH : PX, lh = land ? PX : PH;
  const cs = Math.abs(Math.cos(th)), sn = Math.abs(Math.sin(th));
  const s = Math.min(PX / (lw * cs + lh * sn), PH / (lw * sn + lh * cs));
  g.save(); g.translate(PX / 2, PH / 2); g.rotate((o.dir ?? -1) * th); g.scale(s, s); g.translate(-lw / 2, -lh / 2); // content counter-rotates (phone rolled -90 => dir -1)
  drawPhoneUI(g, lw, lh, app, steps, t, frame);
  g.restore();
  tex.needsUpdate = true;
  const scrOp = 1 - xray;
  // ---- board (seeded components)
  const comps = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    x: (hr(i * 3.3) - 0.5) * w * 0.66, y: h * (0.06 + hr(i * 1.9) * 0.36), sw: w * (0.06 + hr(i * 2.7) * 0.12), sh: w * (0.05 + hr(i * 4.1) * 0.12),
    col: i % 4 === 0 ? '#B8BCC6' : '#1A1C22' })), [w, h]);
  const cp = o.chipPos ?? [0.2, 0.1];
  const cw = w * 0.034;
  const chipCol = new THREE.Color('#5ff4ff');
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={sc}>
      <mesh geometry={body} castShadow={xray < 0.5} renderOrder={5}>
        <meshStandardMaterial color={xray > 0.01 ? '#7FB8E6' : '#15171d'} metalness={0.5} roughness={0.35} transparent={xray > 0.01} opacity={1 - xray * 0.86} depthWrite={xray < 0.5}
          emissive={'#2a6fb0'} emissiveIntensity={xray * 0.35} />
      </mesh>
      {scrOp > 0.01 && <mesh position={[0, 0, w * 0.051]} renderOrder={6}><planeGeometry args={[w * 0.92, h * 0.955]} /><meshBasicMaterial map={tex} toneMapped={false} transparent={scrOp < 1} opacity={scrOp} /></mesh>}
      {/* camera bump */}
      <mesh position={[-w * 0.22, h * 0.36, -w * 0.06]}><boxGeometry args={[w * 0.36, w * 0.36, w * 0.03]} /><meshStandardMaterial color="#2a2d36" roughness={0.3} /></mesh>
      {xray > 0.01 && (
        <group>
          <mesh position={[0, h * 0.24, 0]}><planeGeometry args={[w * 0.84, h * 0.46]} /><meshStandardMaterial map={boardTex()} emissiveMap={boardTex()} emissive="#ffffff" emissiveIntensity={0.35 * xray} roughness={0.6} side={THREE.DoubleSide} transparent opacity={xray} /></mesh>
          <mesh position={[0, -h * 0.2, 0]}><boxGeometry args={[w * 0.8, h * 0.4, w * 0.05]} /><meshStandardMaterial color="#3a3f4a" metalness={0.7} roughness={0.35} transparent opacity={xray} emissive="#223" emissiveIntensity={0.3} /></mesh>
          <mesh position={[0, -h * 0.2, w * 0.026]}><planeGeometry args={[w * 0.5, h * 0.06]} /><meshBasicMaterial color="#6b7280" transparent opacity={xray * 0.8} /></mesh>
          {[0, 1].map((i) => <mesh key={i} position={[-w * 0.22 + i * w * 0.16, h * 0.4, w * 0.012]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[w * 0.055, w * 0.055, w * 0.03, 24]} /><meshStandardMaterial color="#111" metalness={0.6} roughness={0.25} transparent opacity={xray} /></mesh>)}
          {comps.map((q, i) => <mesh key={i} position={[q.x, q.y, w * 0.012]}><boxGeometry args={[q.sw, q.sh, w * 0.018]} /><meshStandardMaterial color={q.col} metalness={0.4} roughness={0.4} transparent opacity={xray} /></mesh>)}
          {/* the accelerometer */}
          <group position={[cp[0] * w, cp[1] * h + h * 0.02, w * 0.014]}>
            <mesh><boxGeometry args={[cw, cw, w * 0.014]} /><meshStandardMaterial color="#121418" metalness={0.3} roughness={0.4} emissive={chipCol} emissiveIntensity={0.9 * chip} transparent opacity={xray} /></mesh>
            {chip > 0.01 && <>
              <mesh position={[0, 0, w * 0.008]}><ringGeometry args={[cw * 0.75, cw * 0.9, 4, 1]} /><meshBasicMaterial color="#9ff8ff" transparent opacity={chip} toneMapped={false} /></mesh>
              {Array.from({ length: 3 }, (_, k) => { const life = ((t / 1.1 + k / 3) % 1); return (
                <mesh key={k} position={[0, 0, w * 0.009]} scale={cw * (0.8 + life * 3.2)} rotation={[0, 0, Math.PI / 4]}><ringGeometry args={[0.92, 1, 4, 1]} /><meshBasicMaterial color="#5ff4ff" transparent opacity={chip * 0.8 * (1 - life)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>); })}
              <pointLight position={[0, 0, w * 0.15]} color="#5ff4ff" intensity={chip * 0.02 * (o.light ?? 1)} distance={w * 2} decay={2} />
            </>}
          </group>
        </group>
      )}
      {(o.light ?? 0) > 0 && xray < 0.5 && <pointLight position={[0, 0, w * 0.9]} color="#d8ecff" intensity={o.light} distance={w * 8} decay={2} />}
    </group>
  );
};

// ================================================================== MEMS die
let dieTex: THREE.CanvasTexture | null = null;
function substrateTex() {
  if (dieTex) return dieTex;
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(512, 512, 50, 512, 512, 760); gr.addColorStop(0, '#4a4f72'); gr.addColorStop(1, '#262a42');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = 'rgba(140,170,255,0.10)'; g.lineWidth = 1.5;
  for (let i = 0; i <= 1024; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(1024, i); g.stroke(); }
  g.strokeStyle = 'rgba(160,190,255,0.28)'; g.lineWidth = 6; g.strokeRect(150, 170, 724, 684); g.strokeRect(120, 140, 784, 744);
  g.fillStyle = 'rgba(190,210,255,0.35)'; g.font = `800 30px ${FONT}`; g.fillText('ODLY-AX3  •  MEMS  •  Si', 140, 960); g.fillText('X →', 860, 960);
  for (let i = 0; i < 4; i++) { g.strokeStyle = 'rgba(190,210,255,0.3)'; g.lineWidth = 3; const x = i % 2 ? 960 : 64, y = i < 2 ? 64 : 900; g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x + 20, y); g.moveTo(x, y - 20); g.lineTo(x, y + 20); g.stroke(); }
  dieTex = new THREE.CanvasTexture(c); dieTex.colorSpace = THREE.SRGBColorSpace; return dieTex;
}
let massTexC: THREE.CanvasTexture | null = null;
function massTex() {
  if (massTexC) return massTexC;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 560; const g = c.getContext('2d')!;
  g.fillStyle = '#B9C3DE'; g.fillRect(0, 0, 1024, 560);
  const gr = g.createLinearGradient(0, 0, 1024, 560); gr.addColorStop(0, 'rgba(255,255,255,0.25)'); gr.addColorStop(0.5, 'rgba(120,140,200,0.05)'); gr.addColorStop(1, 'rgba(255,220,255,0.2)');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 560);
  g.fillStyle = '#1a1e33';
  for (let x = 40; x < 1000; x += 56) for (let y = 40; y < 540; y += 56) g.fillRect(x, y, 24, 24);
  massTexC = new THREE.CanvasTexture(c); massTexC.colorSpace = THREE.SRGBColorSpace; return massTexC;
}
const Beam: React.FC<{ a: number[]; b: number[]; w: number; hgt: number; y: number; mat: THREE.Material }> = ({ a, b, w, hgt, y, mat }) => {
  const dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) + w;
  return <mesh position={[(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2]} rotation={[0, -Math.atan2(dz, dx), 0]} material={mat} castShadow receiveShadow><boxGeometry args={[L, hgt, w]} /></mesh>;
};
export type MemsSpec = { type: 'mems'; id: string; keys?: Key[]; fingers?: number; wires?: boolean; extra?: boolean };
/** keys: pos, rot, scale, dx (mass shift, units), osc (oscillation amplitude), freq (Hz), charge 0..1, hlMove 0..1, hlFixed 0..1, springGlow 0..1, warm 0..1 */
export const Mems: React.FC<{ o: MemsSpec }> = ({ o }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const K = o.keys; const t = frame / fps;
  const pos = sample<number[]>(K, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(K, 'rot', frame, [0, 0, 0]);
  const sc = sample<number>(K, 'scale', frame, 1);
  const osc = sample<number>(K, 'osc', frame, 0), fq = sample<number>(K, 'freq', frame, 1.2);
  const dx = sample<number>(K, 'dx', frame, 0) + osc * Math.sin(t * Math.PI * 2 * fq);
  const charge = sample<number>(K, 'charge', frame, 0);
  const hlM = sample<number>(K, 'hlMove', frame, 0), hlF = sample<number>(K, 'hlFixed', frame, 0);
  const sg = sample<number>(K, 'springGlow', frame, 0);
  const warm = sample<number>(K, 'warm', frame, 0);
  const N = o.fingers ?? 8, P = 0.8, FW = 0.14, L = 2.6, MX = 3.0, MZ = 1.6, Y0 = 0.75, TH = 0.5, YC = Y0 + TH / 2;
  const gap0 = P / 2 - FW;
  const mats = useMemo(() => ({
    mass: new THREE.MeshStandardMaterial({ map: massTex(), color: '#ffffff', metalness: 0.65, roughness: 0.28 }),
    move: new THREE.MeshStandardMaterial({ color: '#C6CFE8', metalness: 0.7, roughness: 0.25, emissive: '#FFC93C', emissiveIntensity: 0 }),
    fixed: new THREE.MeshStandardMaterial({ color: '#8E98B8', metalness: 0.7, roughness: 0.3, emissive: '#3FD4FF', emissiveIntensity: 0 }),
    spring: new THREE.MeshStandardMaterial({ color: '#D2D9EE', metalness: 0.7, roughness: 0.25, emissive: '#FF9F43', emissiveIntensity: 0 }),
    anchor: new THREE.MeshStandardMaterial({ color: '#6E7899', metalness: 0.6, roughness: 0.35 }),
    gold: new THREE.MeshStandardMaterial({ color: '#E8B04A', metalness: 0.95, roughness: 0.22, emissive: '#5a3a05', emissiveIntensity: 0.3 }),
    die: new THREE.MeshStandardMaterial({ map: substrateTex(), metalness: 0.55, roughness: 0.35, color: '#ffffff' }),
  }), []);
  mats.move.emissiveIntensity = hlM * 0.7; mats.fixed.emissiveIntensity = hlF * 0.7;
  mats.spring.emissiveIntensity = sg * 1.2; mats.spring.emissive.set(warm > 0.5 ? '#FFB347' : '#5ff4ff');
  const xs = Array.from({ length: N }, (_, i) => (i - (N - 1) / 2) * P);
  // serpentine spring polyline from mass end (xm) to anchor (xa)
  const spring = (xm: number, xa: number, zc: number) => {
    const folds = 6, A = 0.9; const pts: number[][] = [[xm, zc]];
    for (let i = 0; i < folds; i++) { const x = xm + (xa - xm) * ((i + 0.5) / folds); pts.push([x, zc + (i % 2 ? -A : A)]); pts.push([x, zc + (i % 2 ? A : -A)]); }
    // tidy: connect as meander: horizontal hop then long vertical beam
    const out: number[][] = [[xm, zc]];
    for (let i = 0; i < folds; i++) { const x = xm + (xa - xm) * ((i + 0.5) / folds); const zA = zc + (i % 2 ? -A : A), zB = zc + (i % 2 ? A : -A);
      if (i === 0) { out.push([xm, zA]); } out.push([x, zA]); out.push([x, zB]); }
    out.push([xa, out[out.length - 1][1]]); out.push([xa, zc]);
    return out;
  };
  const springs: number[][][] = [];
  for (const sd of [-1, 1]) for (const zc of [-0.85, 0.85]) springs.push(spring(sd * MX + dx, sd * (MX + 2.3), zc));
  // gap glow slabs
  const glow: { x: number; z: number; w: number; c: THREE.Color; a: number }[] = [];
  if (charge > 0.01) for (const sd of [-1, 1]) for (const xi of xs) for (const side of [-1, 1]) {
    const mx = xi + dx; const fx = xi + side * P / 2; // fixed finger centre
    const gw = Math.max(0.01, Math.abs(fx - mx) - FW); const C = gap0 / gw; // capacitance ∝ 1/gap
    const col = new THREE.Color('#2f7bff').lerp(new THREE.Color('#ffd447'), clamp01((C - 0.6) / 1.4));
    glow.push({ x: (mx + fx) / 2, z: sd * (MZ + 0.35 + (L - 0.35) / 2), w: gw, c: col, a: charge * clamp01(0.25 + 0.4 * C) * (0.85 + 0.15 * Math.sin(t * 20 + xi * 3)) });
  }
  const wires = useMemo(() => {
    if (o.wires === false) return [];
    const out: THREE.TubeGeometry[] = [];
    for (let i = 0; i < 10; i++) {
      const sd = i < 5 ? -1 : 1; const k = i % 5; const px = -6 + k * 3;
      const a = new THREE.Vector3(px, 0.15, sd * 8.6), b = new THREE.Vector3(px * 0.55, 1.3, sd * (MZ + L + 0.95));
      const m = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 2.2, 0));
      out.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 24, 0.06, 8, false));
    }
    return out;
  }, [o.wires]);
  if (sc < 1e-3) return null;
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={sc}>
      {/* die */}
      <mesh position={[0, -0.3, 0]} material={mats.die} receiveShadow><boxGeometry args={[24, 0.6, 20]} /></mesh>
      {/* proof mass */}
      <mesh position={[dx, YC, 0]} castShadow receiveShadow material={[mats.anchor, mats.anchor, mats.mass, mats.anchor, mats.anchor, mats.anchor] as any}><boxGeometry args={[MX * 2, TH, MZ * 2]} /></mesh>
      {/* moving fingers */}
      {[-1, 1].map((sd) => xs.map((xi, i) => <mesh key={`m${sd}${i}`} position={[xi + dx, YC, sd * (MZ + L / 2)]} material={mats.move} castShadow receiveShadow><boxGeometry args={[FW, TH, L]} /></mesh>))}
      {/* fixed fingers + rails */}
      {[-1, 1].map((sd) => [...xs.map((x) => x - P / 2), xs[N - 1] + P / 2].map((xf, i) => <mesh key={`f${sd}${i}`} position={[xf, YC, sd * (MZ + 0.35 + L / 2)]} material={mats.fixed} castShadow receiveShadow><boxGeometry args={[FW, TH, L]} /></mesh>))}
      {[-1, 1].map((sd) => <mesh key={`r${sd}`} position={[0, (Y0 + TH) / 2, sd * (MZ + 0.35 + L + 0.25)]} material={mats.anchor} castShadow receiveShadow><boxGeometry args={[N * P + 1.2, Y0 + TH, 0.5]} /></mesh>)}
      {/* springs + anchors */}
      {springs.map((pts, si) => pts.slice(1).map((p, k) => <Beam key={`s${si}-${k}`} a={pts[k]} b={p} w={0.07} hgt={TH * 0.8} y={YC} mat={mats.spring} />))}
      {[-1, 1].map((sd) => <mesh key={`a${sd}`} position={[sd * (MX + 2.55), (Y0 + TH) / 2, 0]} material={mats.anchor} castShadow receiveShadow><boxGeometry args={[0.5, Y0 + TH, 2.6]} /></mesh>)}
      {/* charge glow */}
      {glow.map((q, i) => <mesh key={`g${i}`} position={[q.x, YC, q.z]}><boxGeometry args={[q.w, TH * 0.92, L - 0.4]} /><meshBasicMaterial color={q.c} transparent opacity={q.a} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>)}
      {/* bond pads + wires */}
      {o.wires !== false && [-1, 1].map((sd) => Array.from({ length: 5 }, (_, k) => <mesh key={`p${sd}${k}`} position={[-6 + k * 3, 0.03, sd * 8.6]} material={mats.gold} receiveShadow><boxGeometry args={[1.1, 0.08, 1.1]} /></mesh>))}
      {wires.map((gq, i) => <mesh key={`w${i}`} geometry={gq} material={mats.gold} castShadow />)}
      {/* guard ring */}
      {o.extra !== false && [[0, -9.6, 22, 0.35], [0, 9.6, 22, 0.35]].map(([x, z, w, d], i) => <mesh key={`gr${i}`} position={[x, 0.12, z]} material={mats.anchor} receiveShadow><boxGeometry args={[w, 0.24, d]} /></mesh>)}
      {o.extra !== false && [-1, 1].map((sd) => <mesh key={`gs${sd}`} position={[sd * 11.6, 0.12, 0]} material={mats.anchor} receiveShadow><boxGeometry args={[0.35, 0.24, 19.5]} /></mesh>)}
    </group>
  );
};

// ================================================================== hair strand
let hairTexC: THREE.CanvasTexture | null = null;
function hairTex() {
  if (hairTexC) return hairTexC;
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#2a1a10'); gr.addColorStop(0.5, '#5a3a22'); gr.addColorStop(1, '#2a1a10');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 1024);
  for (let y = 0; y < 1024; y += 26) { // cuticle scale edges
    g.strokeStyle = 'rgba(210,170,120,0.45)'; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= 256; x += 8) { const yy = y + Math.sin(x / 40 + y) * 6 + hr(x + y) * 3; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke();
  }
  hairTexC = new THREE.CanvasTexture(c); hairTexC.colorSpace = THREE.SRGBColorSpace; hairTexC.wrapS = hairTexC.wrapT = THREE.RepeatWrapping; return hairTexC;
}
export type HairSpec = { type: 'hair'; id: string; radius?: number; length?: number; keys?: Key[] };
export const Hair: React.FC<{ o: HairSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const r = o.radius ?? 1, Lh = o.length ?? 40;
  const tex = useMemo(() => { const t = hairTex().clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, Lh / (r * 6)); t.needsUpdate = true; return t; }, [r, Lh]);
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const sc = sample<number>(o.keys, 'scale', frame, 1);
  if (sc < 1e-3) return null;
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={sc}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[r, r, Lh, 48, 1]} /><meshStandardMaterial map={tex} roughness={0.45} metalness={0.1} color="#ffffff" emissive="#3a2210" emissiveIntensity={0.25} /></mesh>
    </group>
  );
};

// ================================================================== glowing arrow
export type Arrow3Spec = { type: 'arrow3'; id: string; dir?: number[]; color?: string; radius?: number; keys?: Key[] };
/** keys: pos (tail), len, opacity */
export const Arrow3: React.FC<{ o: Arrow3Spec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const len = sample<number>(o.keys, 'len', frame, 1);
  const op = sample<number>(o.keys, 'opacity', frame, 1);
  if (len < 1e-3 || op < 0.01) return null;
  const R = o.radius ?? 0.05; const head = Math.min(len * 0.4, R * 5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...((o.dir ?? [0, -1, 0]) as [number, number, number])).normalize());
  const col = o.color ?? '#FFD447';
  const shaft = Math.max(0.001, len - head);
  return (
    <group position={pos as any} quaternion={q}>
      <mesh position={[0, shaft / 2, 0]}><cylinderGeometry args={[R, R, shaft, 16]} /><meshBasicMaterial color={col} toneMapped={false} transparent opacity={op} /></mesh>
      <mesh position={[0, shaft + head / 2, 0]}><coneGeometry args={[R * 2.6, head, 24]} /><meshBasicMaterial color={col} toneMapped={false} transparent opacity={op} /></mesh>
      <mesh position={[0, len / 2, 0]}><cylinderGeometry args={[R * 3, R * 3, len, 16, 1, true]} /><meshBasicMaterial color={col} transparent opacity={0.18 * op} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
    </group>
  );
};

// ================================================================== text billboard
export type TagSpec = { type: 'tag'; id: string; text: string; size?: number; color?: string; at?: number; until?: number; keys?: Key[]; bg?: string; depthTest?: boolean };
/** camera-facing label. keys: pos, n (counter for `{n}` in text), scale. size = world height */
export const Tag: React.FC<{ o: TagSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const n = sample<number>(o.keys, 'n', frame, 0);
  const text = o.text.replace('{n}', fmtID(n));
  const { c, t: tex } = useCanvasTex(1024, 512);
  const lines = text.split('\n');
  const g = c.getContext('2d')!; g.clearRect(0, 0, 1024, 512);
  let fs = 100; g.font = `900 ${fs}px ${FONT}`;
  const mw = Math.max(...lines.map((l) => g.measureText(l).width)); if (mw > 900) { fs = Math.floor(fs * 900 / mw); g.font = `900 ${fs}px ${FONT}`; }
  const w = Math.min(1010, Math.max(...lines.map((l) => g.measureText(l).width)) + 80); const hh = lines.length * fs * 1.18 + 50;
  const x = (1024 - w) / 2, y = (512 - hh) / 2; const col = o.color ?? '#FFD447';
  g.fillStyle = o.bg ?? 'rgba(10,16,34,0.86)'; rr(g, x, y, w, hh, 40); g.fill(); g.lineWidth = 9; g.strokeStyle = col; rr(g, x, y, w, hh, 40); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.font = `900 ${i === 0 ? fs : fs * 0.78}px ${FONT}`; g.fillStyle = i === 0 ? col : '#FFFFFF'; g.fillText(l, 512, y + 25 + fs * 0.59 + i * fs * 1.18); });
  tex.needsUpdate = true;
  const at = o.at ?? 0; const a = clamp01((frame - at) / 6) * (o.until !== undefined && frame > o.until ? clamp01(1 - (frame - o.until) / 5) : 1);
  if (a < 0.01) return null;
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]); const sc = sample<number>(o.keys, 'scale', frame, 1);
  const H = (o.size ?? 1) * sc * (0.75 + 0.25 * clamp01((frame - at) / 6));
  return <sprite position={pos as any} scale={[H * 2, H, 1]} renderOrder={20}><spriteMaterial map={tex} transparent opacity={a} depthTest={o.depthTest ?? false} depthWrite={false} toneMapped={false} /></sprite>;
};

// ================================================================== readout graph panel
export type GraphSpec = { type: 'graph'; id: string; size?: number[]; title?: string; rate?: number; keys?: Key[]; at?: number; color?: string; light?: number };
/** keys: pos, rot, scale, v (signal level -1..1), osc (amplitude), freq (Hz), on 0..1 */
export const Graph: React.FC<{ o: GraphSpec }> = ({ o }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const [w, h] = o.size ?? [4, 2.6];
  const { c, t: tex } = useCanvasTex(1024, Math.round(1024 * h / w));
  const W = c.width, H = c.height; const g = c.getContext('2d')!;
  const col = o.color ?? '#5ff4ff';
  const sig = (f: number) => sample<number>(o.keys, 'v', f, 0) + sample<number>(o.keys, 'osc', f, 0) * Math.sin((f / fps) * Math.PI * 2 * sample<number>(o.keys, 'freq', f, 1.2));
  g.fillStyle = '#06101f'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(95,244,255,0.12)'; g.lineWidth = 2;
  for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, 110); g.lineTo(x, H - 30); g.stroke(); }
  for (let y = 110; y < H - 20; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = col; g.font = `900 56px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(o.title ?? 'KAPASITANSI', 36, 58);
  const rate = o.rate ?? 400; const at = o.at ?? 0; const n = Math.max(0, Math.floor(((frame - at) / fps) * rate));
  g.textAlign = 'right'; g.fillStyle = '#FFD447'; g.font = `900 52px ${FONT}`; g.fillText(`${fmtID(n)} x`, W - 36, 58);
  // trace: last 2.5 s right-aligned
  const mid = (110 + H - 30) / 2, amp = (H - 160) / 2 * 0.85; const span = 2.5 * fps;
  g.strokeStyle = col; g.lineWidth = 7; g.shadowColor = col; g.shadowBlur = 18; g.beginPath();
  for (let i = 0; i <= 120; i++) { const f = frame - span + (i / 120) * span; const x = 30 + (i / 120) * (W - 60); const y = mid - sig(Math.max(0, f)) * amp * (f < at ? 0.0 : 1); i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke(); g.shadowBlur = 0;
  // sample dots (dense: many readings per second)
  g.fillStyle = '#FFFFFF';
  for (let i = 0; i <= 60; i++) { const f = frame - span + (i / 60) * span; if (f < at) continue; const x = 30 + (i / 60) * (W - 60); const y = mid - sig(f) * amp; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
  const sx = W - 30, sy = mid - sig(frame) * amp; g.fillStyle = '#FFD447'; g.beginPath(); g.arc(sx, sy, 14 + 4 * Math.sin(frame), 0, Math.PI * 2); g.fill();
  tex.needsUpdate = true;
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]); const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]); const sc = sample<number>(o.keys, 'scale', frame, 1);
  if (sc < 1e-3) return null;
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={sc}>
      <mesh position={[0, 0, -0.06]} castShadow><boxGeometry args={[w + 0.2, h + 0.2, 0.1]} /><meshStandardMaterial color="#1b2338" metalness={0.6} roughness={0.35} /></mesh>
      <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      {(o.light ?? 0) > 0 && <pointLight position={[0, 0, 1.2]} color={col} intensity={o.light} distance={w * 3} decay={1.5} />}
    </group>
  );
};

export const MemsObject: React.FC<{ o: any }> = ({ o }) => {
  switch (o.type) {
    case 'uiphone': return <UiPhone o={o} />;
    case 'mems': return <Mems o={o} />;
    case 'hair': return <Hair o={o} />;
    case 'arrow3': return <Arrow3 o={o} />;
    case 'tag': return <Tag o={o} />;
    case 'graph': return <Graph o={o} />;
    default: return null;
  }
};
export const MEMS_TYPES = ['uiphone', 'mems', 'hair', 'arrow3', 'tag', 'graph'];
