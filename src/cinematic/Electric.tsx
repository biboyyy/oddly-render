// EP024 "Kenapa Burung Nggak Kesetrum?" — reusable procedural props for the cinematic engine:
//   bird (sparrow / eagle with breathing, blinks, head drift, scratch, wing spread/flap),
//   powerline (poles, crossarms, insulators, catenary wires), current (glowing charge dashes along a path),
//   arc (jagged electric arc + light), spark (particle bursts), feathers (slow drifting fall),
//   tanks (two water tanks + pipe + flow), kite (diamond kite + tail + string, string can carry current),
//   icon (canvas pictograms: boot_x / question / warning / bolt), glow (fake-bloom halo sprite),
//   contact (soft blob contact shadow / baked AO), houses (row of simple gang houses with lit windows).
// Everything is a pure function of the frame (Remotion renders out of order).
// Coordinates: three.js Y up, metres; rot in degrees; `at`/frames are scene-local frames.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useThree } from '@react-three/fiber';
import { DEG, Key, noise1, sample } from './tracks';
import { Town } from './Town';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const hr = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const V = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);

// ------------------------------------------------------------------ shared textures
const texCache: Record<string, THREE.Texture> = {};
function radialTex(key: string, stops: Array<[number, string]>) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); texCache[key] = t; return t;
}
export const glowTex = () => radialTex('glow', [[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,0.65)'], [0.5, 'rgba(255,255,255,0.16)'], [1, 'rgba(255,255,255,0)']]);
const blobTex = () => radialTex('blob', [[0, 'rgba(0,0,0,0.85)'], [0.45, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]);

/** additive halo sprite = fake bloom that works on the CPU (swangle) renderer */
export const Halo: React.FC<{ pos: number[] | THREE.Vector3; size: number; color: string; opacity?: number }> = ({ pos, size, color, opacity = 1 }) => (
  opacity <= 0.005 ? null : <sprite position={(Array.isArray(pos) ? pos : [pos.x, pos.y, pos.z]) as any} scale={[size, size, 1]} renderOrder={15}>
    <spriteMaterial map={glowTex()} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
  </sprite>
);

// ------------------------------------------------------------------ glow + contact
export const Glow: React.FC<{ o: { id: string; size?: number; color?: string; keys?: Key[]; flicker?: number } }> = ({ o }) => {
  const f = useCurrentFrame();
  const pos = sample<number[]>(o.keys, 'pos', f, [0, 0, 0]);
  const i = sample<number>(o.keys, 'i', f, 1) * (1 + (o.flicker ?? 0) * noise1(f * 0.7, 3));
  const sz = sample<number>(o.keys, 'size', f, o.size ?? 1);
  return <Halo pos={pos} size={sz} color={o.color ?? '#ffd27a'} opacity={i} />;
};

export const Contact: React.FC<{ o: { id: string; size?: number[]; opacity?: number; keys?: Key[] } }> = ({ o }) => {
  const f = useCurrentFrame();
  const pos = sample<number[]>(o.keys, 'pos', f, [0, 0, 0]);
  const op = sample<number>(o.keys, 'opacity', f, o.opacity ?? 0.55);
  const [w, d] = o.size ?? [1, 1];
  if (op <= 0.01) return null;
  return (
    <mesh position={[pos[0], pos[1] + 0.004, pos[2]]} rotation={[-Math.PI / 2, 0, (sample<number>(o.keys, 'yaw', f, 0)) * DEG]} renderOrder={2}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={blobTex()} transparent opacity={op} depthWrite={false} polygonOffset polygonOffsetFactor={-2} toneMapped={false} />
    </mesh>
  );
};

// ------------------------------------------------------------------ bird
type BirdSpec = {
  id: string; species?: 'sparrow' | 'eagle'; size?: number; keys?: Key[]; seed?: number;
  colors?: { body?: string; belly?: string; head?: string; wing?: string; beak?: string; feet?: string };
  scratch?: Array<{ at: number; dur?: number }>; // sparrow head scratch with a foot
  life?: boolean; // breathing / blink / head drift (default true)
  shock?: { at: number; dur?: number }; // brief stiffen + glow tint (electrocution beat)
  grip?: number; // wire radius (m) the toes curl around (default 0.014)
};
const SPECIES = {
  sparrow: { body: '#8a5a36', belly: '#e8d8bd', head: '#7a4e30', wing: '#6b4428', beak: '#3a2f2a', feet: '#e09a76', cap: '#8f8f96', wingLen: 0.55, wingW: 0.26 },
  eagle: { body: '#6a4630', belly: '#5a3c28', head: '#f4f1ea', wing: '#3a2719', beak: '#f2b52c', feet: '#f2c23c', cap: '#f4f1ea', wingLen: 1.25, wingW: 0.42 },
};
/** keys: pos (feet point), yaw, pitch (deg), spread 0..1 (wings open), flap (amplitude 0..1), headYaw, headPitch (deg), hop (m) */
export const Bird: React.FC<{ o: BirdSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = SPECIES[o.species ?? 'sparrow'];
  const col = { ...sp, ...(o.colors ?? {}) };
  const mats = useMemo(() => {
    const m = (c: string, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 });
    return { body: m(col.body), belly: m(col.belly), head: m(col.head), wing: m(col.wing), beak: m(col.beak, 0.5), feet: m(col.feet, 0.6), cap: m(col.cap),
      eye: m('#141414', 0.25), white: m('#ffffff', 0.4), dark: m('#2a1d14') };
  }, [o.id]);
  const seed = o.seed ?? o.id.length * 13;
  const life = o.life !== false;
  const t = f / fps;
  const pos = sample<number[]>(o.keys, 'pos', f, [0, 0, 0]);
  const yaw = sample<number>(o.keys, 'yaw', f, 0);
  const pitch = sample<number>(o.keys, 'pitch', f, 0);
  const spread = sample<number>(o.keys, 'spread', f, 0);
  const flap = sample<number>(o.keys, 'flap', f, 0);
  const hop = sample<number>(o.keys, 'hop', f, 0);
  const droop = sample<number>(o.keys, 'droop', f, 0) * DEG; // lowers the opened wings around the body's forward axis
  let hYaw = sample<number>(o.keys, 'headYaw', f, 0) * DEG;
  let hPitch = sample<number>(o.keys, 'headPitch', f, 0) * DEG;
  let hRoll = 0;
  const S = o.size ?? (o.species === 'eagle' ? 0.9 : 0.16);
  // life: breathing, birdy head "ticks" (quick turns + holds), blinks
  const breath = life ? 1 + 0.035 * Math.sin(t * 2 * Math.PI * (o.species === 'eagle' ? 0.45 : 1.1) + seed) : 1;
  if (life) {
    const seg = Math.floor(t * 1.3 + seed * 0.37), u = clamp01(((t * 1.3 + seed * 0.37) % 1) / 0.18);
    const a0 = (hr(seg + seed) - 0.5) * 1.1, a1 = (hr(seg + 1 + seed) - 0.5) * 1.1;
    hYaw += (a0 + (a1 - a0) * (1 - Math.pow(1 - u, 3))) * (o.species === 'eagle' ? 0.45 : 0.8);
    hPitch += 0.08 * Math.sin(t * 1.7 + seed);
  }
  let blink = 1;
  if (life) { const p = (f + seed * 7) % 97; if (p < 4) blink = p < 2 ? 0.1 : 0.5; }
  // scratch: lift right foot to the head, head tilts into it, foot jitters
  let scratch = 0;
  for (const s of o.scratch ?? []) {
    const d = s.dur ?? 40; const x = (f - s.at) / d;
    if (x > 0 && x < 1) scratch = Math.max(scratch, Math.sin(Math.PI * clamp01(x * 1.15)) );
  }
  hRoll += scratch * 0.7; hPitch += scratch * 0.45; hYaw += scratch * 0.35;
  let shockA = 0;
  if (o.shock) { const x = (f - o.shock.at) / (o.shock.dur ?? 12); if (x > 0 && x < 1) shockA = 1 - x; }
  const shake = shockA * 0.04 * Math.sin(f * 2.7);
  const wingRot = (side: number) => {
    const fl = flap * Math.sin(t * Math.PI * 2 * (o.species === 'eagle' ? 1.6 : 7)) * 0.9;
    const sp2 = Math.max(spread, shockA * 0.6);
    return [-0.12 * sp2, -side * (sp2 * 1.45), side * (-0.15 + sp2 * 0.25 + fl + scratch * 0.15)] as [number, number, number];
  };
  const footLift = scratch;
  // posture: sparrows sit low and level, raptors perch upright (tail down); keep in sync with wingtip() in ep024/build_storyboard.py
  const eagle = o.species === 'eagle';
  const LEG = eagle ? 0.24 : 0.26, BODY_Y = eagle ? 0.62 : 0.56, BODY_PITCH = eagle ? -0.62 : -0.18;
  return (
    <group position={[pos[0], pos[1] + hop, pos[2]]} rotation={[pitch * DEG, yaw * DEG, shake]} scale={S}>
      {/* legs + gripping toes (origin = perch point) */}
      {[-1, 1].map((sd) => {
        const lift = sd > 0 ? footLift : 0;
        return (
          <group key={sd} position={[sd * (0.09 + lift * 0.12), LEG + lift * 0.42, 0.02 + lift * 0.18]} rotation={[-lift * 2.2 + Math.sin(f * 1.9) * lift * 0.3, 0, sd * lift * -1.0]}>
            <mesh position={[0, -LEG / 2, 0]} material={mats.feet} castShadow><cylinderGeometry args={[0.024, 0.03, LEG, 8]} /></mesh>
            {/* toes curl around the wire (radius `grip`): three forward over the front, hallux around the back, dark claws */}
            {(() => {
              const R = Math.max(0.04, (o.grip ?? 0.014) / S) * (1 - lift), tr = 0.019, cy = -LEG - R;
              const on = (th: number, rr: number) => [0, cy + rr * Math.cos(th), rr * Math.sin(th)] as [number, number, number];
              const seg = (th0: number, th1: number, k: string) => {
                const a = on(th0, R + tr * 0.8), b = on(th1, R + tr * 0.8);
                const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] as [number, number, number];
                const len = Math.hypot(b[1] - a[1], b[2] - a[2]);
                return <mesh key={k} position={mid} rotation={[Math.atan2(b[2] - a[2], b[1] - a[1]), 0, 0]} material={mats.feet} castShadow><capsuleGeometry args={[tr, Math.max(0.005, len), 4, 8]} /></mesh>;
              };
              const claw = (th: number, sgn: number, k: string) => { const p = on(th, R + tr * 0.6); return <mesh key={k} position={p} rotation={[th + sgn * Math.PI / 2, 0, 0]} material={mats.dark}><coneGeometry args={[tr * 0.8, tr * 2.6, 6]} /></mesh>; };
              return [-0.32, 0, 0.32].map((a, k) => (
                <group key={k} rotation={[0, a, 0]}>
                  <mesh position={[0, -LEG + tr * 0.5, 0]} material={mats.feet}><sphereGeometry args={[tr * 1.5, 10, 8]} /></mesh>
                  {seg(0.15, 1.0, 'p')}{seg(1.0, 1.75, 'd')}{claw(1.95, 1, 'c')}
                </group>
              )).concat([<group key="h">{seg(-0.15, -0.95, 'hp')}{seg(-0.95, -1.6, 'hd')}{claw(-1.8, -1, 'hc')}</group>]);
            })()}
          </group>
        );
      })}
      <group position={[0, BODY_Y, 0]} scale={[breath, breath, 1]} rotation={[BODY_PITCH, 0, 0]}>
        <mesh scale={[0.42, 0.4, 0.62]} material={mats.body} castShadow receiveShadow><sphereGeometry args={[1, 28, 20]} /></mesh>
        <mesh position={[0, -0.1, 0.24]} scale={[0.35, 0.3, 0.43]} material={mats.belly} castShadow><sphereGeometry args={[1, 24, 16]} /></mesh>
        {/* tail */}
        <mesh position={[0, -0.02, -0.62]} rotation={[0.35, 0, 0]} scale={[o.species === 'eagle' ? 0.3 : 0.2, 0.05, o.species === 'eagle' ? 0.42 : 0.36]} material={o.species === 'eagle' ? mats.head : mats.wing} castShadow><sphereGeometry args={[1, 16, 10]} /></mesh>
        {/* wings: pivot at the shoulder, long axis backwards; spread swings them out sideways */}
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * 0.3, 0.12, 0.12]} rotation={[0, 0, -sd * droop]}><group rotation={wingRot(sd)}>
            <mesh position={[sd * 0.02, 0, -sp.wingLen * 0.5]} scale={[0.07, sp.wingW * 0.55, sp.wingLen * 0.55]} material={mats.wing} castShadow><sphereGeometry args={[1, 18, 12]} /></mesh>
            {[0, 1, 2, 3].map((k) => (
              <mesh key={k} position={[sd * (0.02 + k * 0.012), -0.02 - k * 0.025, -sp.wingLen * (0.82 + k * 0.05)]} rotation={[0, sd * (0.05 + k * 0.07), 0]} scale={[0.03, sp.wingW * 0.22, sp.wingLen * 0.22]} material={mats.dark} castShadow><sphereGeometry args={[1, 10, 8]} /></mesh>
            ))}
          </group></group>
        ))}
        {/* head */}
        <group position={[0, 0.3, 0.32]} rotation={[hPitch - BODY_PITCH * 0.8, hYaw, hRoll]}>
          <mesh position={[0, 0.06, 0.06]} scale={o.species === 'eagle' ? [0.25, 0.25, 0.3] : [0.25, 0.24, 0.25]} material={mats.head} castShadow><sphereGeometry args={[1, 24, 18]} /></mesh>
          {o.species !== 'eagle' && <mesh position={[0, 0.16, 0.04]} scale={[0.17, 0.08, 0.17]} material={mats.cap}><sphereGeometry args={[1, 16, 10]} /></mesh>}
          {o.species !== 'eagle' && [-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.2, -0.02, 0.1]} scale={[0.05, 0.08, 0.09]} material={mats.white}><sphereGeometry args={[1, 10, 8]} /></mesh>)}
          {o.species !== 'eagle' && <mesh position={[0, -0.1, 0.2]} scale={[0.09, 0.07, 0.06]} material={mats.dark}><sphereGeometry args={[1, 10, 8]} /></mesh>}
          <mesh position={[0, 0.02, o.species === 'eagle' ? 0.38 : 0.3]} rotation={[Math.PI / 2 + (o.species === 'eagle' ? 0.25 : 0.1), 0, 0]} material={mats.beak} castShadow>
            <coneGeometry args={[o.species === 'eagle' ? 0.08 : 0.06, o.species === 'eagle' ? 0.2 : 0.14, 12]} />
          </mesh>
          {[-1, 1].map((sd) => (
            <group key={sd} position={[sd * (o.species === 'eagle' ? 0.17 : 0.15), 0.1, o.species === 'eagle' ? 0.255 : 0.235]} rotation={[0, sd * 0.45, 0]} scale={[1, blink * (o.species === 'eagle' ? 0.8 : 1), 1]}>
              <mesh scale={0.06} material={mats.white}><sphereGeometry args={[1, 12, 10]} /></mesh>
              <mesh position={[sd * 0.012, 0.004, 0.03]} scale={0.042} material={mats.eye}><sphereGeometry args={[1, 12, 10]} /></mesh>
              <mesh position={[sd * 0.01, 0.022, 0.066]} scale={0.012} material={mats.white}><sphereGeometry args={[1, 8, 6]} /></mesh>
              {o.species === 'eagle' && <mesh position={[0, 0.05, 0.02]} rotation={[0, 0, sd * -0.35]} scale={[0.08, 0.018, 0.06]} material={mats.head}><boxGeometry /></mesh>}
            </group>
          ))}
        </group>
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ power line
export function wireY(x: number, poles: number[], y0: number, sag: number) {
  const ps = [...poles].sort((a, b) => a - b);
  for (let i = 0; i < ps.length - 1; i++) if (x >= ps[i] && x <= ps[i + 1]) { const u = (x - ps[i]) / (ps[i + 1] - ps[i]); return y0 - sag * 4 * u * (1 - u); }
  return y0;
}
type PowerSpec = { id: string; poles: number[]; z?: number; height?: number; wires?: number[]; sag?: number; radius?: number; color?: string; pole?: string; extend?: number; keys?: Key[] };
/** wires run along X at z offsets `wires` (default [-0.75, 0, 0.75]); wire y at a pole = height - 0.32 */
export const PowerLine: React.FC<{ o: PowerSpec }> = ({ o }) => {
  const H = o.height ?? 9, z0 = o.z ?? 0, wires = o.wires ?? [-0.75, 0, 0.75], sag = o.sag ?? 0.35, R = o.radius ?? 0.014;
  const y0 = H - 0.32;
  const poles = o.poles;
  const ext = o.extend ?? 0;
  const geos = useMemo(() => wires.map((wz) => {
    const xs = [...poles].sort((a, b) => a - b);
    const x0 = xs[0] - ext, x1 = xs[xs.length - 1] + ext;
    const pts: THREE.Vector3[] = [];
    const n = 160;
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; pts.push(new THREE.Vector3(x, x < xs[0] || x > xs[xs.length - 1] ? y0 - sag * 0.6 * Math.min(1, Math.abs(x < xs[0] ? x - xs[0] : x - xs[xs.length - 1]) / 20) * 4 * 0.25 : wireY(x, xs, y0, sag), z0 + wz)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, R, 8, false);
  }), [o.id]);
  const wireMat = useMemo(() => new THREE.MeshStandardMaterial({ color: o.color ?? '#1d1f24', roughness: 0.45, metalness: 0.6 }), [o.id]);
  const poleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: o.pole ?? '#8d8a84', roughness: 0.9 }), [o.id]);
  const armMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5a5d63', roughness: 0.6, metalness: 0.5 }), []);
  const insMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e4d8', roughness: 0.25, metalness: 0 }), []);
  const span = Math.max(...wires) - Math.min(...wires) + 0.7;
  return (
    <group>
      {geos.map((g, i) => <mesh key={i} geometry={g} material={wireMat} castShadow />)}
      {poles.map((x, i) => (
        <group key={i} position={[x, 0, z0]}>
          <mesh position={[0, H / 2, 0]} material={poleMat} castShadow receiveShadow><cylinderGeometry args={[0.11, 0.16, H, 14]} /></mesh>
          <mesh position={[0, H - 0.55, 0]} material={armMat} castShadow><boxGeometry args={[0.12, 0.12, span]} /></mesh>
          <mesh position={[0, H - 0.95, span * 0.25]} rotation={[0.8, 0, 0]} material={armMat}><boxGeometry args={[0.05, 0.05, 0.9]} /></mesh>
          {wires.map((wz, k) => (
            <group key={k} position={[0, H - 0.49, wz]}>
              {[0, 1, 2].map((d) => <mesh key={d} position={[0, 0.04 + d * 0.055, 0]} material={insMat} castShadow><cylinderGeometry args={[0.075 - d * 0.008, 0.075 - d * 0.008, 0.03, 16]} /></mesh>)}
              <mesh position={[0, 0.12, 0]} material={insMat}><cylinderGeometry args={[0.025, 0.03, 0.12, 8]} /></mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
};

// ------------------------------------------------------------------ current along a path
type CurrentSpec = { id: string; path: number[][]; speed?: number; spacing?: number; size?: number; color?: string; keys?: Key[]; line?: number; radius?: number };
/** keys: on (0..1). Glowing dashes travel path[0] -> path[n]; `line` = faint glowing core along the path */
export const Current: React.FC<{ o: CurrentSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const on = sample<number>(o.keys, 'on', f, 1);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(o.path.map(V), false, 'catmullrom', 0.1), [o.id]);
  const len = useMemo(() => curve.getLength(), [curve]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, Math.max(16, o.path.length * 24), o.radius ?? 0.02, 8, false), [curve]);
  if (on <= 0.01) return null;
  const sp = o.spacing ?? 0.25, n = Math.min(400, Math.ceil(len / sp));
  const off = ((f / fps) * (o.speed ?? 1.2)) % sp;
  const col = o.color ?? '#ffd23a';
  return (
    <group>
      {(o.line ?? 0.6) > 0 && <mesh geometry={tube} renderOrder={14}><meshBasicMaterial color={col} transparent opacity={on * (o.line ?? 0.6)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>}
      {Array.from({ length: n }, (_, k) => {
        const d = k * sp + off; if (d > len) return null;
        const p = curve.getPointAt(d / len);
        const fl = 0.75 + 0.25 * Math.sin(k * 2.1 + f * 0.9);
        return <Halo key={k} pos={p} size={(o.size ?? 0.12) * fl} color={col} opacity={on * 0.95} />;
      })}
    </group>
  );
};

// ------------------------------------------------------------------ electric arc
type ArcSpec = { id: string; from: number[]; to: number[]; keys?: Key[]; color?: string; jag?: number; light?: number; branches?: number;
  width?: number; strands?: number; halo?: number }; // width = core radius (m, default scales with length); strands = extra parallel bolts; halo = glow size (m)
/** keys: on (0..1), from/to may be keyed too. Re-jags every 2 frames. */
export const Arc: React.FC<{ o: ArcSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const on = sample<number>(o.keys, 'on', f, 1);
  if (on <= 0.01) return null;
  const a = V(sample<number[]>(o.keys, 'from', f, o.from)), b = V(sample<number[]>(o.keys, 'to', f, o.to));
  const seed = Math.floor(f / 2) * 17.3;
  const dir = b.clone().sub(a); const L = dir.length();
  const side = new THREE.Vector3(0, 1, 0).cross(dir).normalize(); if (side.lengthSq() < 0.1) side.set(1, 0, 0);
  const up = dir.clone().cross(side).normalize();
  const bolt = (s: number, from: THREE.Vector3, to: THREE.Vector3, segs: number, amp: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs, env = Math.sin(Math.PI * u);
      const p = from.clone().lerp(to, u).addScaledVector(side, (hr(s + i * 3.1) - 0.5) * amp * env).addScaledVector(up, (hr(s + i * 7.7) - 0.5) * amp * env);
      pts.push(p);
    }
    return pts;
  };
  const main = bolt(seed, a, b, 16, (o.jag ?? 0.18) * L);
  const geo = (pts: THREE.Vector3[], r: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), pts.length * 3, r, 6, false);
  const col = o.color ?? '#9fd4ff';
  const W = o.width ?? 0.012 * Math.max(1, L);
  const strands = Array.from({ length: o.strands ?? 0 }, (_, k) => bolt(seed + 200 + k * 31, a, b, 12, (o.jag ?? 0.18) * L * 1.3));
  const br = Array.from({ length: o.branches ?? 2 }, (_, k) => { const i = 3 + Math.floor(hr(seed + k * 9) * 10); const s = main[i]; const e = s.clone().addScaledVector(side, (hr(seed + k) - 0.5) * L * 0.7).addScaledVector(up, (hr(seed + k * 5) - 0.5) * L * 0.5).addScaledVector(dir, 0.15 * (hr(seed + k * 4) - 0.3)); return bolt(seed + 40 + k, s, e, 6, 0.12 * L); });
  const mid = a.clone().lerp(b, 0.5);
  const fl = on * (0.75 + 0.25 * hr(f * 1.7));
  const HS = o.halo ?? (0.9 * L * 0.5 + 0.4);
  const add = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false } as const;
  return (
    <group>
      <mesh geometry={geo(main, W)} renderOrder={16}><meshBasicMaterial color={'#ffffff'} transparent opacity={fl} depthWrite={false} toneMapped={false} /></mesh>
      <mesh geometry={geo(main, W * 3)} renderOrder={16}><meshBasicMaterial color={'#dff2ff'} opacity={fl * 0.55} {...add} /></mesh>
      <mesh geometry={geo(main, W * 7)} renderOrder={16}><meshBasicMaterial color={col} opacity={fl * 0.3} {...add} /></mesh>
      {strands.map((p, k) => <React.Fragment key={'s' + k}>
        <mesh geometry={geo(p, W * 0.55)} renderOrder={16}><meshBasicMaterial color={'#f4fbff'} opacity={fl * 0.85} {...add} /></mesh>
        <mesh geometry={geo(p, W * 2.5)} renderOrder={16}><meshBasicMaterial color={col} opacity={fl * 0.3} {...add} /></mesh>
      </React.Fragment>)}
      {br.map((p, k) => <mesh key={k} geometry={geo(p, W * 0.5)} renderOrder={16}><meshBasicMaterial color={'#e8f6ff'} opacity={fl * 0.85} {...add} /></mesh>)}
      <Halo pos={a} size={HS} color={col} opacity={fl} />
      <Halo pos={b} size={HS} color={col} opacity={fl} />
      <Halo pos={a} size={HS * 0.35} color={'#ffffff'} opacity={fl} />
      <Halo pos={b} size={HS * 0.35} color={'#ffffff'} opacity={fl} />
      <Halo pos={mid} size={Math.max(L * 1.6, HS * 1.6)} color={col} opacity={fl * 0.5} />
      <pointLight position={mid as any} color={col} intensity={(o.light ?? 30) * fl} distance={L * 8 + 6} decay={1.6} />
    </group>
  );
};

// ------------------------------------------------------------------ sparks
type SparkSpec = { id: string; pos: number[]; at?: number; repeat?: number; gap?: number; bursts?: number[]; count?: number; speed?: number; color?: string; life?: number; light?: number; size?: number };
/** bursts at `at` (cue-resolved) + `repeat` more every `gap` frames (or raw frame list `bursts`) */
export const Spark: React.FC<{ o: SparkSpec }> = ({ o: o0 }) => {
  const f = useCurrentFrame();
  const o = { ...o0, bursts: o0.bursts ?? Array.from({ length: (o0.repeat ?? 0) + 1 }, (_, k) => (o0.at ?? 0) + k * (o0.gap ?? 9)) };
  const L = o.life ?? 12, n = o.count ?? 18, col = o.color ?? '#ffe28a';
  const items: React.ReactNode[] = [];
  let flash = 0;
  o.bursts.forEach((b0, bi) => {
    const age = f - b0; if (age < 0 || age > L) return;
    const u = age / L; flash = Math.max(flash, 1 - u);
    for (let k = 0; k < n; k++) {
      const s = bi * 101 + k * 7.13;
      const th = hr(s) * Math.PI * 2, ph = (hr(s + 1) - 0.25) * Math.PI * 0.9, v = (o.speed ?? 1.6) * (0.4 + hr(s + 2));
      const tt = age / 30;
      const p = [o.pos[0] + Math.cos(th) * Math.cos(ph) * v * tt, o.pos[1] + Math.sin(ph) * v * tt - 4.9 * tt * tt, o.pos[2] + Math.sin(th) * Math.cos(ph) * v * tt];
      items.push(<Halo key={`${bi}_${k}`} pos={p} size={(o.size ?? 0.06) * (1 - u * 0.6)} color={col} opacity={1 - u} />);
    }
  });
  if (!items.length) return null;
  return <group>{items}<Halo pos={o.pos} size={(o.size ?? 0.06) * 9 * flash} color={col} opacity={flash} /><pointLight position={o.pos as any} color={col} intensity={(o.light ?? 6) * flash} distance={5} decay={1.8} /></group>;
};

// ------------------------------------------------------------------ feathers
type FeatherSpec = { id: string; at: number; center: number[]; count?: number; spread?: number; fall?: number; color?: string; color2?: string; size?: number };
export const Feathers: React.FC<{ o: FeatherSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const age = (f - o.at) / 30;
  const mats = useMemo(() => [new THREE.MeshStandardMaterial({ color: o.color ?? '#7a5a40', roughness: 0.9, side: THREE.DoubleSide, emissive: '#3a2a20', emissiveIntensity: 0.4 }), new THREE.MeshStandardMaterial({ color: o.color2 ?? '#efe9dd', roughness: 0.9, side: THREE.DoubleSide, emissive: '#6a6058', emissiveIntensity: 0.4 })], [o.id]);
  if (age < 0) return null;
  const n = o.count ?? 14, sp = o.spread ?? 0.8, S = o.size ?? 0.12;
  return (
    <group>
      {Array.from({ length: n }, (_, k) => {
        const s = k * 3.7 + 1;
        const burst = 1 - Math.exp(-age * 3);
        const x = o.center[0] + (hr(s) - 0.5) * sp * 2 * burst + Math.sin(age * 2.2 + s) * 0.12 * age;
        const z = o.center[2] + (hr(s + 1) - 0.5) * sp * 2 * burst + Math.cos(age * 1.9 + s) * 0.1 * age;
        const y = o.center[1] + (hr(s + 2) - 0.2) * sp * burst - (o.fall ?? 0.45) * age;
        return (
          <mesh key={k} position={[x, y, z]} rotation={[Math.sin(age * 3 + s) * 1.2, age * 2 + s, Math.cos(age * 2.5 + s) * 0.9]} scale={[0.3, 1, 1]} material={mats[k % 2 === 0 ? 1 : 0]} castShadow>
            <circleGeometry args={[S * 0.5, 10]} />
          </mesh>
        );
      })}
    </group>
  );
};

// ------------------------------------------------------------------ water tanks (potential-difference analogy)
type TankSpec = { id: string; a: number[]; b: number[]; r?: number; h?: number; keys?: Key[]; water?: string; ground?: number; spout?: boolean; tower?: boolean };
/** a/b = tank base centres [x,z]; keys: ya, yb (base heights), la, lb (water level 0..1), flow (0..1).
 *  spout: pipe leaves A's bottom and pours over B's rim (visible falling stream); else bottoms are connected.
 *  tower: A stands on a brick tower with a ladder instead of 4 thin legs (reads clearly "higher"). */
export const Tanks: React.FC<{ o: TankSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = o.r ?? 0.55, h = o.h ?? 1.2, g = o.ground ?? 0;
  const ya = sample<number>(o.keys, 'ya', f, 2), yb = sample<number>(o.keys, 'yb', f, 0.2);
  const la = sample<number>(o.keys, 'la', f, 0.8), lb = sample<number>(o.keys, 'lb', f, 0.2);
  const flow = sample<number>(o.keys, 'flow', f, 0);
  const t = f / fps;
  const mats = useMemo(() => ({
    glass: new THREE.MeshPhysicalMaterial({ color: '#e6f6ff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    rim: new THREE.MeshStandardMaterial({ color: '#d7dde3', roughness: 0.35, metalness: 0.7 }),
    band: new THREE.MeshStandardMaterial({ color: '#3a6fa8', roughness: 0.5, metalness: 0.3 }),
    water: new THREE.MeshStandardMaterial({ color: o.water ?? '#1f8fe6', roughness: 0.12, metalness: 0, transparent: true, opacity: 0.93, emissive: '#0b5aa8', emissiveIntensity: 0.45 }),
    surf: new THREE.MeshStandardMaterial({ color: '#8fd6ff', roughness: 0.05, metalness: 0.1, emissive: '#3aa8ff', emissiveIntensity: 0.5 }),
    stream: new THREE.MeshStandardMaterial({ color: '#6cc6ff', roughness: 0.05, transparent: true, opacity: 0.88, emissive: '#2a8fe0', emissiveIntensity: 0.6 }),
    stand: new THREE.MeshStandardMaterial({ color: '#8b6a4a', roughness: 0.85 }),
    brick: new THREE.MeshStandardMaterial({ color: '#b5654a', roughness: 0.9 }),
    mortar: new THREE.MeshStandardMaterial({ color: '#d8c8b0', roughness: 0.95 }),
    pipe: new THREE.MeshStandardMaterial({ color: '#b8c2cc', roughness: 0.3, metalness: 0.8 }),
  }), [o.id]);
  const tank = (c: number[], y: number, lvl: number, key: string, tower: boolean) => {
    const wh = (h - 0.08) * lvl, wob = 0.012 * Math.sin(t * 3 + c[0]);
    return (
      <group key={key} position={[c[0], y, c[1]]}>
        <mesh position={[0, h / 2, 0]} material={mats.glass}><cylinderGeometry args={[r, r, h, 40, 1, true]} /></mesh>
        <mesh position={[0, 0.02, 0]} material={mats.rim} castShadow receiveShadow><cylinderGeometry args={[r + 0.04, r + 0.04, 0.05, 40]} /></mesh>
        <mesh position={[0, h, 0]} material={mats.rim}><torusGeometry args={[r, 0.03, 8, 40]} /></mesh>
        <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.rim}><torusGeometry args={[r, 0.03, 8, 40]} /></mesh>
        {[0.33, 0.66].map((u) => <mesh key={u} position={[0, h * u, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.band}><torusGeometry args={[r + 0.005, 0.012, 6, 40]} /></mesh>)}
        {lvl > 0.01 && <>
          <mesh position={[0, 0.04 + wh / 2, 0]} material={mats.water} castShadow><cylinderGeometry args={[r - 0.015, r - 0.015, wh, 40]} /></mesh>
          <mesh position={[0, 0.045 + wh + wob, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.surf}><circleGeometry args={[r - 0.016, 40]} /></mesh>
        </>}
        {y - g > 0.05 && !tower && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], k) => (
          <mesh key={k} position={[sx * r * 0.7, -(y - g) / 2, sz * r * 0.7]} material={mats.stand} castShadow><boxGeometry args={[0.1, y - g, 0.1]} /></mesh>
        ))}
        {y - g > 0.05 && tower && <>
          <mesh position={[0, -(y - g) / 2, 0]} material={mats.brick} castShadow receiveShadow><boxGeometry args={[r * 1.7, y - g, r * 1.7]} /></mesh>
          {Array.from({ length: Math.floor((y - g) / 0.22) }, (_, k) => <mesh key={k} position={[0, -(y - g) + 0.11 + k * 0.22, 0]} material={mats.mortar}><boxGeometry args={[r * 1.72, 0.02, r * 1.72]} /></mesh>)}
          <mesh position={[0, -0.04, 0]} material={mats.rim} castShadow><boxGeometry args={[r * 2.2, 0.08, r * 2.2]} /></mesh>
          {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 0.16, -(y - g) / 2, r * 0.85 + 0.12]} material={mats.pipe}><boxGeometry args={[0.03, y - g, 0.03]} /></mesh>)}
          {Array.from({ length: Math.floor((y - g) / 0.3) }, (_, k) => <mesh key={'r' + k} position={[0, -(y - g) + 0.2 + k * 0.3, r * 0.85 + 0.12]} material={mats.pipe}><boxGeometry args={[0.32, 0.025, 0.025]} /></mesh>)}
        </>}
      </group>
    );
  };
  // pipe
  const pa = new THREE.Vector3(o.a[0] + r, ya + 0.12, o.a[1]);
  let pts: THREE.Vector3[]; let spoutEnd: THREE.Vector3 | null = null;
  if (o.spout) {
    const topB = yb + h + 0.22;
    spoutEnd = new THREE.Vector3(o.b[0] - r * 0.35, topB, o.b[1]);
    pts = [pa, pa.clone().add(new THREE.Vector3(0.22, 0, 0)), new THREE.Vector3(pa.x + 0.32, Math.max(topB + 0.25, (pa.y + topB) / 2), pa.z), new THREE.Vector3(o.b[0] - r - 0.15, topB + 0.12, o.b[1]), spoutEnd];
  } else {
    const pb = new THREE.Vector3(o.b[0] - r, yb + 0.12, o.b[1]);
    pts = [pa, pa.clone().add(new THREE.Vector3(0.35, 0, 0)), new THREE.Vector3((pa.x + pb.x) / 2, Math.min(pa.y, pb.y) - 0.05, pa.z), pb.clone().add(new THREE.Vector3(-0.35, 0, 0)), pb];
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
  const pipeGeo = new THREE.TubeGeometry(curve, 48, 0.07, 10, false);
  const surfB = yb + 0.045 + (h - 0.08) * lb;
  return (
    <group>
      {tank(o.a, ya, la, 'a', !!o.tower)}
      {tank(o.b, yb, lb, 'b', false)}
      <mesh geometry={pipeGeo} material={mats.pipe} castShadow />
      {flow > 0.02 && Array.from({ length: 16 }, (_, k) => {
        const u = ((k / 16) + t * 0.7) % 1;
        const p = curve.getPointAt(u);
        return <Halo key={k} pos={[p.x, p.y + 0.08, p.z + 0.08]} size={0.18} color={'#7fd0ff'} opacity={flow * 0.9} />;
      })}
      {flow > 0.02 && spoutEnd && (() => {
        const len = Math.max(0.05, spoutEnd.y - surfB);
        return <group>
          <mesh position={[spoutEnd.x, spoutEnd.y - len / 2, spoutEnd.z]} material={mats.stream} scale={[flow, 1, flow]}><cylinderGeometry args={[0.055, 0.075, len, 16, 1, true]} /></mesh>
          {Array.from({ length: 6 }, (_, k) => { const u = ((k / 6) + t * 1.8) % 1; return <Halo key={k} pos={[spoutEnd.x, spoutEnd.y - u * len, spoutEnd.z + 0.06]} size={0.13} color={'#d8f2ff'} opacity={flow * 0.8} />; })}
          {Array.from({ length: 8 }, (_, k) => { const u = ((k / 8) + t * 2.2) % 1; const th = k * 2.4; return <Halo key={'d' + k} pos={[spoutEnd.x + Math.cos(th) * u * 0.25, surfB + Math.sin(Math.PI * u) * 0.18, spoutEnd.z + Math.sin(th) * u * 0.25]} size={0.07} color={'#e8f8ff'} opacity={flow * (1 - u)} />; })}
        </group>;
      })()}
      {flow > 0.02 && <mesh position={[spoutEnd ? spoutEnd.x : o.b[0], surfB + 0.012, o.b[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1 + 0.25 * ((t * 1.5) % 1), 0.13 + 0.25 * ((t * 1.5) % 1), 32]} /><meshBasicMaterial color={'#ffffff'} transparent opacity={flow * 0.7 * (1 - (t * 1.5) % 1)} depthWrite={false} />
      </mesh>}
    </group>
  );
};

// ------------------------------------------------------------------ kite
type KiteSpec = { id: string; keys?: Key[]; size?: number; color?: string; color2?: string; anchor?: number[]; sag?: number };
/** keys: pos, rot (deg), anchor (string end, e.g. the kid's hand), glow (0..1 current through the string), sag, slack */
export const Kite: React.FC<{ o: KiteSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pos = sample<number[]>(o.keys, 'pos', f, [0, 6, 0]);
  const rot = sample<number[]>(o.keys, 'rot', f, [0, 0, 0]);
  const anchor = sample<number[]>(o.keys, 'anchor', f, o.anchor ?? [0, 1, 0]);
  const glow = sample<number>(o.keys, 'glow', f, 0);
  const sag = sample<number>(o.keys, 'sag', f, o.sag ?? 0.25);
  const S = o.size ?? 0.8;
  const t = f / fps;
  const kmats = useMemo(() => [new THREE.MeshStandardMaterial({ color: o.color ?? '#e8433a', roughness: 0.7, side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: o.color2 ?? '#f6c945', roughness: 0.7, side: THREE.DoubleSide })], [o.id]);
  const diamond = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([0, 0.6, 0, -0.42, 0.1, 0, 0, -0.6, 0, 0.42, 0.1, 0]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g;
  }, []);
  const half = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0.6, 0.001, -0.42, 0.1, 0.001, 0, -0.6, 0.001]), 3)); g.computeVertexNormals(); return g; }, []);
  const bob = [Math.sin(t * 1.3) * 0.05, Math.sin(t * 1.9) * 0.04, 0];
  const kp = new THREE.Vector3(pos[0] + bob[0] * S, pos[1] + bob[1] * S, pos[2]);
  const bottom = kp.clone().add(new THREE.Vector3(0, -0.5 * S, 0));
  const a = V(anchor);
  const pts = Array.from({ length: 25 }, (_, i) => { const u = i / 24; return a.clone().lerp(kp, u).add(new THREE.Vector3(0, -sag * 4 * u * (1 - u) * a.distanceTo(kp) * 0.1, 0)); });
  const sGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.006, 5, false);
  const sCurve = new THREE.CatmullRomCurve3(pts);
  return (
    <group>
      <group position={kp as any} rotation={[rot[0] * DEG, rot[1] * DEG, (rot[2] + 6 * Math.sin(t * 1.6)) * DEG]} scale={S}>
        <mesh geometry={diamond} material={kmats[0]} castShadow />
        <mesh geometry={half} material={kmats[1]} />
        <mesh position={[0, 0, 0.01]} material={kmats[1]}><boxGeometry args={[0.02, 1.2, 0.01]} /></mesh>
        <mesh position={[0, 0.1, 0.01]} material={kmats[1]}><boxGeometry args={[0.84, 0.02, 0.01]} /></mesh>
        {Array.from({ length: 6 }, (_, k) => (
          <mesh key={k} position={[Math.sin(t * 3 + k * 0.9) * 0.08 * k * 0.4, -0.7 - k * 0.22, 0]} rotation={[0, 0, Math.sin(t * 3 + k) * 0.5]} material={kmats[k % 2]}><planeGeometry args={[0.16, 0.07]} /></mesh>
        ))}
      </group>
      <mesh geometry={sGeo}><meshStandardMaterial color={glow > 0.05 ? '#ffe9a0' : '#f4f1e8'} emissive={'#ffd23a'} emissiveIntensity={glow * 2} toneMapped={glow < 0.05} /></mesh>
      {glow > 0.02 && Array.from({ length: 18 }, (_, k) => { const u = ((k / 18) + t * 0.9) % 1; return <Halo key={k} pos={sCurve.getPointAt(u)} size={0.14} color={'#ffd23a'} opacity={glow} />; })}
      {void bottom}
    </group>
  );
};

// ------------------------------------------------------------------ icons
type IconSpec = { id: string; icon: 'boot_x' | 'question' | 'warning' | 'bolt'; size?: number; keys?: Key[]; at?: number; until?: number; depthTest?: boolean;
  screen?: number[] }; // [fx, fy, frac]: pinned to the camera (frame coords 0..1, size as fraction of frame height)
const iconTex = (icon: string) => {
  if (texCache['icon_' + icon]) return texCache['icon_' + icon];
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
  g.lineJoin = 'round'; g.lineCap = 'round';
  const disc = (fill: string) => { g.fillStyle = fill; g.beginPath(); g.arc(256, 256, 236, 0, Math.PI * 2); g.fill(); g.lineWidth = 18; g.strokeStyle = '#0d1426'; g.stroke(); };
  if (icon === 'boot_x') {
    disc('rgba(255,255,255,0.95)');
    g.fillStyle = '#2c2c34'; g.beginPath(); g.moveTo(170, 120); g.lineTo(290, 120); g.lineTo(290, 300); g.quadraticCurveTo(300, 330, 380, 340); g.quadraticCurveTo(410, 350, 405, 395); g.lineTo(150, 395); g.lineTo(150, 360); g.lineTo(170, 340); g.closePath(); g.fill();
    g.fillStyle = '#f2c23c'; g.fillRect(170, 150, 120, 22); g.fillStyle = '#55555f'; g.fillRect(150, 372, 255, 23);
    g.strokeStyle = '#e5243b'; g.lineWidth = 46; g.beginPath(); g.moveTo(110, 110); g.lineTo(402, 402); g.moveTo(402, 110); g.lineTo(110, 402); g.stroke();
  } else if (icon === 'question') {
    disc('#FFD447'); g.fillStyle = '#0d1426'; g.font = '900 360px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 256, 276);
  } else if (icon === 'warning') {
    g.fillStyle = '#FFD447'; g.strokeStyle = '#0d1426'; g.lineWidth = 22; g.beginPath(); g.moveTo(256, 40); g.lineTo(482, 452); g.lineTo(30, 452); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#0d1426'; g.beginPath(); g.moveTo(275, 150); g.lineTo(200, 300); g.lineTo(255, 300); g.lineTo(232, 410); g.lineTo(318, 255); g.lineTo(262, 255); g.lineTo(292, 150); g.closePath(); g.fill();
  } else {
    disc('#0d1426'); g.fillStyle = '#FFD447'; g.beginPath(); g.moveTo(290, 70); g.lineTo(150, 290); g.lineTo(240, 290); g.lineTo(200, 450); g.lineTo(360, 220); g.lineTo(270, 220); g.lineTo(320, 70); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texCache['icon_' + icon] = t; return t;
};
/** pops in at `at` with an overshoot, fades out after `until` */
export const Icon: React.FC<{ o: IconSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const camera = useThree((st) => st.camera);
  const at = o.at ?? 0;
  const x = clamp01((f - at) / 8);
  const pop = x <= 0 ? 0 : 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
  const out = o.until !== undefined && f > o.until ? clamp01(1 - (f - o.until) / 6) : 1;
  if (pop * out < 0.01) return null;
  let pos = sample<number[]>(o.keys, 'pos', f, [0, 0, 0]);
  let base = o.size ?? 1;
  if (o.screen) { // camera-pinned: CameraRig already placed the camera for this frame (rendered earlier in the tree)
    const cam = camera as THREE.PerspectiveCamera; const d = 0.5; cam.updateMatrixWorld();
    const hh = Math.tan((cam.fov * DEG) / 2) * d, hw = hh * cam.aspect;
    const p = new THREE.Vector3((o.screen[0] - 0.5) * 2 * hw, (0.5 - o.screen[1]) * 2 * hh, -d).applyMatrix4(cam.matrixWorld);
    pos = [p.x, p.y, p.z]; base = (o.screen[2] ?? 0.12) * 2 * hh;
  }
  const S = base * pop * (1 + 0.03 * Math.sin(f / 6));
  return <sprite position={pos as any} scale={[S, S, 1]} renderOrder={21}><spriteMaterial map={iconTex(o.icon)} transparent opacity={out} depthTest={o.depthTest ?? false} depthWrite={false} toneMapped={false} /></sprite>;
};

// ------------------------------------------------------------------ gang houses
type HousesSpec = { id: string; x0: number; x1: number; z: number; face?: 1 | -1; seed?: number; depth?: number; lit?: number };
const PAL = ['#d9c7a8', '#c9d3c2', '#e2b996', '#b9c7d6', '#e6d9b8', '#cfa98c', '#d7c1c9'];
const ROOF = ['#8a3b2a', '#6e4a3a', '#7a2e28', '#5a4a44', '#9a5a3a'];
/** row of 1–2 storey kampung houses along X (fronts face +z when face=1) with warm lit windows, roof tiles, AC/tandon */
export const Houses: React.FC<{ o: HousesSpec }> = ({ o }) => {
  const built = useMemo(() => {
    let s = o.seed ?? 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const items: Array<{ x: number; w: number; h: number; d: number; c: string; roof: string; win: boolean[] }> = [];
    for (let x = o.x0; x < o.x1;) { const w = 3.2 + r() * 2.6; items.push({ x: x + w / 2, w, h: r() < 0.45 ? 5.6 + r() : 3.1 + r() * 0.6, d: o.depth ?? 6, c: PAL[Math.floor(r() * PAL.length)], roof: ROOF[Math.floor(r() * ROOF.length)], win: [r() < 0.75, r() < 0.6, r() < 0.5] }); x += w + 0.05; }
    return items;
  }, [o.id]);
  const fz = o.face ?? 1;
  const lit = o.lit ?? 1.6;
  return (
    <group>
      {built.map((b, i) => (
        <group key={i} position={[b.x, 0, o.z - fz * b.d / 2]}>
          <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow><boxGeometry args={[b.w, b.h, b.d]} /><meshStandardMaterial color={b.c} roughness={0.95} /></mesh>
          <mesh position={[0, b.h + 0.35, 0]} rotation={[0, 0, 0]} castShadow><boxGeometry args={[b.w + 0.4, 0.7, b.d + 0.6]} /><meshStandardMaterial color={b.roof} roughness={0.8} /></mesh>
          <mesh position={[0, 0.35, fz * (b.d / 2 + 0.01)]}><boxGeometry args={[b.w, 0.7, 0.04]} /><meshStandardMaterial color={'#6d6a66'} roughness={1} /></mesh>
          {/* door + windows on the street side */}
          <mesh position={[-b.w * 0.25, 1.05, fz * (b.d / 2 + 0.02)]}><boxGeometry args={[0.9, 2.0, 0.04]} /><meshStandardMaterial color={'#5a3b26'} roughness={0.7} /></mesh>
          {b.win.map((on, k) => {
            const wy = k === 2 ? 4.3 : 1.55, wx = k === 0 ? b.w * 0.18 : k === 1 ? b.w * 0.36 : 0;
            if (k === 2 && b.h < 5) return null;
            return <mesh key={k} position={[wx, wy, fz * (b.d / 2 + 0.03)]}><boxGeometry args={[0.85, 0.9, 0.03]} /><meshStandardMaterial color={on ? '#ffd9a0' : '#2b3340'} emissive={on ? '#ffb86a' : '#000000'} emissiveIntensity={on ? lit : 0} toneMapped={!on} /></mesh>;
          })}
          {i % 3 === 1 && <mesh position={[b.w * 0.3, b.h + 1.0, 0]} castShadow><cylinderGeometry args={[0.45, 0.45, 0.9, 16]} /><meshStandardMaterial color={'#3b6fb6'} roughness={0.6} /></mesh>}
        </group>
      ))}
    </group>
  );
};

export const ELECTRIC_TYPES = ['bird', 'powerline', 'current', 'arc', 'spark', 'feathers', 'tanks', 'kite', 'icon', 'glow', 'contact', 'houses', 'town'];
export const ElectricObject: React.FC<{ o: any }> = ({ o }) => {
  switch (o.type) {
    case 'bird': return <Bird o={o} />;
    case 'powerline': return <PowerLine o={o} />;
    case 'current': return <Current o={o} />;
    case 'arc': return <Arc o={o} />;
    case 'spark': return <Spark o={o} />;
    case 'feathers': return <Feathers o={o} />;
    case 'tanks': return <Tanks o={o} />;
    case 'kite': return <Kite o={o} />;
    case 'icon': return <Icon o={o} />;
    case 'glow': return <Glow o={o} />;
    case 'contact': return <Contact o={o} />;
    case 'houses': return <Houses o={o} />;
    case 'town': return <Town o={o} />;
    default: return null;
  }
};
