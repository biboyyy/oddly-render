// EP019 medieval battle props (War of the Bucket, 1325):
//  army    — instanced toon soldiers (body/legs/head/kettle-helm/heraldic shield/spear) with march/run gaits,
//            spear `charge`, staggered `flee` (turn around + scatter), banners carried in the ranks
//  banner  — pole + waving cloth with canvas heraldry (cross / halves / stripes)
//  bucket  — procedural wooden bucket (staves, iron hoops, arched handle), the "Secchia rapita"
//  gallop  — GLB (mounted knight / horse) following keyed pos with gallop bob + pitch, auto heading
//  lightcone — soft additive volumetric spotlight cone
//  helm    — kettle hat for toon cast attach (`attach[].obj`)
// Coordinates: three.js (Y up, metres). `at` values are scene frames (resolved by the pipeline).
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useCurrentFrame } from 'remotion';
import { GLBModel } from './GLBModel';
import { DEG, Key, sample } from './tracks';

const hr = (i: number, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-6, b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- heraldry canvas
export function heraldry(pattern: string, field: string, charge: string, w = 256, h = 256, shield = false, text?: string) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, w, h);
  if (shield) {
    g.beginPath(); g.moveTo(w * 0.06, h * 0.04); g.lineTo(w * 0.94, h * 0.04); g.lineTo(w * 0.94, h * 0.45);
    g.quadraticCurveTo(w * 0.92, h * 0.82, w * 0.5, h * 0.98); g.quadraticCurveTo(w * 0.08, h * 0.82, w * 0.06, h * 0.45); g.closePath();
    g.save(); g.clip();
  }
  g.fillStyle = field; g.fillRect(0, 0, w, h);
  g.fillStyle = charge;
  if (pattern === 'cross') { g.fillRect(w * 0.4, 0, w * 0.2, h); g.fillRect(0, h * 0.36, w, h * 0.2); }
  else if (pattern === 'halves') { g.fillRect(w * 0.5, 0, w * 0.5, h); }
  else if (pattern === 'stripes') { for (let k = 0; k < 4; k++) g.fillRect(w * (k * 0.25 + 0.125), 0, w * 0.125, h); }
  else if (pattern === 'pales') { g.fillRect(w / 3, 0, w / 3, h); }
  if (text) {
    g.fillStyle = '#ffffff'; g.font = `900 ${Math.round(h * 0.16)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeStyle = '#1a1206'; g.lineWidth = h * 0.03; g.strokeText(text, w / 2, h * 0.8); g.fillText(text, w / 2, h * 0.8);
  }
  if (shield) {
    g.restore();
    g.lineWidth = w * 0.06; g.strokeStyle = '#3b2a1a';
    g.beginPath(); g.moveTo(w * 0.06, h * 0.04); g.lineTo(w * 0.94, h * 0.04); g.lineTo(w * 0.94, h * 0.45);
    g.quadraticCurveTo(w * 0.92, h * 0.82, w * 0.5, h * 0.98); g.quadraticCurveTo(w * 0.08, h * 0.82, w * 0.06, h * 0.45); g.closePath(); g.stroke();
  } else {
    // cloth shading stripes
    const gr = g.createLinearGradient(0, 0, w, 0);
    for (let k = 0; k <= 6; k++) gr.addColorStop(k / 6, k % 2 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------- banner
type BannerSpec = { id: string; keys?: Key[]; pattern?: string; field?: string; charge?: string; size?: number[]; pole?: number; wind?: number; text?: string; seed?: number; poleColor?: string };
export const Banner: React.FC<{ o: BannerSpec; frameOverride?: number }> = ({ o, frameOverride }) => {
  const f0 = useCurrentFrame(); const frame = frameOverride ?? f0;
  const [W, H] = o.size ?? [1.2, 0.8]; const P = o.pole ?? 3.2;
  const tex = useMemo(() => heraldry(o.pattern ?? 'cross', o.field ?? '#ffffff', o.charge ?? '#c8102e', 256, 170, false, o.text), [o.pattern, o.field, o.charge, o.text]);
  const geo = useMemo(() => new THREE.PlaneGeometry(W, H, 18, 6), [W, H]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const vis = sample<number>(o.keys, 'visible', frame, 1);
  const t = frame / 30, wnd = o.wind ?? 1, sd = o.seed ?? 0;
  const arr = geo.attributes.position.array as Float32Array;
  for (let i = 0; i < arr.length; i += 3) {
    const x = base[i] + W / 2, y = base[i + 1];
    const k = x / W;
    arr[i + 2] = Math.sin(x * 4.2 - t * 6.5 * wnd + sd) * 0.09 * k * wnd + Math.sin(x * 9 - t * 9 + y * 3 + sd) * 0.025 * k * wnd;
    arr[i + 1] = base[i + 1] - k * k * 0.06 * (1 - 0.5 * wnd);
  }
  geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  if (vis < 0.5) return null;
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]}>
      <mesh position={[0, P / 2, 0]} castShadow><cylinderGeometry args={[0.03, 0.035, P, 8]} /><meshStandardMaterial color={o.poleColor ?? '#5a3a1e'} roughness={0.8} /></mesh>
      <mesh position={[0, P + 0.05, 0]}><sphereGeometry args={[0.06, 10, 8]} /><meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.35} /></mesh>
      <mesh geometry={geo} position={[W / 2 + 0.03, P - H / 2 - 0.08, 0]} castShadow><meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.85} /></mesh>
    </group>
  );
};

// ---------------------------------------------------------------- army (instanced)
type ArmySpec = {
  id: string; keys?: Key[]; rows?: number; cols?: number; spacing?: number[]; jitter?: number; seed?: number; scale?: number;
  tunic?: string; tunic2?: string; legs?: string; helm?: string; skin?: string; field?: string; charge?: string; pattern?: string;
  spears?: boolean; shields?: boolean; banners?: number; bannerSize?: number[];
  fleeDist?: number; fleeSpread?: number; drop?: number; mask?: number[][]; // mask: list of [x0,z0,x1,z1] local rects to skip
};
const PARTS = ['body', 'belt', 'legL', 'legR', 'head', 'helm', 'brim', 'shield', 'spear', 'tip', 'armL', 'armR'] as const;
export const Army: React.FC<{ o: ArmySpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const rows = o.rows ?? 6, cols = o.cols ?? 10;
  const [sx, sz] = o.spacing ?? [1.1, 1.2];
  const S = o.scale ?? 1;
  const soldiers = useMemo(() => {
    const out: Array<{ x: number; z: number; r: number; r2: number; r3: number }> = [];
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const k = i * cols + j; const jt = o.jitter ?? 0.25;
      const x = (j - (cols - 1) / 2) * sx + (hr(k, 1 + (o.seed ?? 0)) - 0.5) * jt * sx * 2;
      const z = -(i - (rows - 1) / 2) * sz + (hr(k, 2 + (o.seed ?? 0)) - 0.5) * jt * sz * 2;
      if ((o.mask ?? []).some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1)) continue;
      out.push({ x, z, r: hr(k, 3 + (o.seed ?? 0)), r2: hr(k, 4 + (o.seed ?? 0)), r3: hr(k, 5 + (o.seed ?? 0)) });
    }
    return out;
  }, [rows, cols, sx, sz, o.jitter, o.seed, JSON.stringify(o.mask ?? [])]);
  const n = soldiers.length;
  const shieldTex = useMemo(() => heraldry(o.pattern ?? 'cross', o.field ?? '#ffffff', o.charge ?? '#c8102e', 128, 160, true), [o.pattern, o.field, o.charge]);
  const geos = useMemo(() => ({
    body: new THREE.CapsuleGeometry(0.2, 0.36, 4, 10), belt: new THREE.CylinderGeometry(0.215, 0.215, 0.06, 12),
    legL: new THREE.CylinderGeometry(0.075, 0.065, 0.62, 8).translate(0, -0.31, 0), legR: new THREE.CylinderGeometry(0.075, 0.065, 0.62, 8).translate(0, -0.31, 0),
    head: new THREE.SphereGeometry(0.22, 14, 10), helm: new THREE.SphereGeometry(0.235, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    brim: new THREE.CylinderGeometry(0.34, 0.36, 0.03, 16), shield: new THREE.BoxGeometry(0.46, 0.58, 0.04),
    spear: new THREE.CylinderGeometry(0.018, 0.018, 2.5, 6).translate(0, 0.75, 0), tip: new THREE.ConeGeometry(0.045, 0.2, 6).translate(0, 2.1, 0),
    armL: new THREE.CapsuleGeometry(0.055, 0.34, 3, 6).translate(0, -0.2, 0), armR: new THREE.CapsuleGeometry(0.055, 0.34, 3, 6).translate(0, -0.2, 0),
  }), []);
  const mats = useMemo(() => {
    const shieldMats = [new THREE.MeshStandardMaterial({ color: '#4a3220', roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: '#4a3220', roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: '#4a3220' }), new THREE.MeshStandardMaterial({ color: '#4a3220' }),
      new THREE.MeshStandardMaterial({ map: shieldTex, alphaTest: 0.5, roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: shieldTex, color: '#6a4a32', alphaTest: 0.5, roughness: 0.8 })];
    return {
      body: new THREE.MeshStandardMaterial({ color: o.tunic ?? '#b3262e', roughness: 0.85 }),
      belt: new THREE.MeshStandardMaterial({ color: o.tunic2 ?? '#3a2616', roughness: 0.7 }),
      legL: new THREE.MeshStandardMaterial({ color: o.legs ?? '#3b3a40', roughness: 0.9 }), legR: new THREE.MeshStandardMaterial({ color: o.legs ?? '#3b3a40', roughness: 0.9 }),
      head: new THREE.MeshStandardMaterial({ color: o.skin ?? '#e8b48e', roughness: 0.7 }),
      helm: new THREE.MeshStandardMaterial({ color: o.helm ?? '#9aa3ad', metalness: 0.75, roughness: 0.35 }), brim: new THREE.MeshStandardMaterial({ color: o.helm ?? '#9aa3ad', metalness: 0.75, roughness: 0.35 }),
      shield: shieldMats as any, spear: new THREE.MeshStandardMaterial({ color: '#6b4a2a', roughness: 0.8 }), tip: new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.8, roughness: 0.3 }),
      armL: new THREE.MeshStandardMaterial({ color: o.tunic ?? '#b3262e', roughness: 0.85 }), armR: new THREE.MeshStandardMaterial({ color: o.tunic ?? '#b3262e', roughness: 0.85 }),
    } as Record<string, any>;
  }, [o.tunic, o.tunic2, o.legs, o.skin, o.helm, shieldTex]);
  const refs = useRef<Record<string, THREE.InstancedMesh | null>>({});
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const gait = sample<number>(o.keys, 'gait', frame, 0);        // 0 stand, 1 march, 2 run
  const charge = sample<number>(o.keys, 'charge', frame, 0);    // spear lowered forward 0..1
  const flee = sample<number>(o.keys, 'flee', frame, 0);        // 0..1 turn + scatter progress
  const cheer = sample<number>(o.keys, 'cheer', frame, 0);      // arms/spears raised + hop
  const vis = sample<number>(o.keys, 'visible', frame, 1);
  const t = frame / 30;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1);
  const root = new THREE.Matrix4(), part = new THREE.Matrix4();
  const set = (name: string, i: number, m: THREE.Matrix4) => { const im = refs.current[name]; if (im) im.setMatrixAt(i, m); };
  useLayoutEffect(() => {
    soldiers.forEach((s, i) => {
      const fl = smooth(s.r * 0.45, s.r * 0.45 + 0.25, flee);           // per-soldier turn progress
      const yaw = fl * Math.PI * (s.r2 > 0.5 ? 1 : -1) + (s.r3 - 0.5) * 0.25 * fl;
      const g = Math.max(gait, fl > 0.05 ? 2 : 0);
      const freq = g > 1.5 ? 2.6 : 1.7, amp = g < 0.05 ? 0 : g > 1.5 ? 0.75 : 0.45 * Math.min(1, g);
      const ph = t * freq * Math.PI * 2 + s.r * 6.28;
      const lean = g > 1.5 ? 0.22 : 0.04 * g;
      const bob = Math.abs(Math.sin(ph)) * (g > 1.5 ? 0.09 : 0.04 * g) + cheer * Math.abs(Math.sin(t * 7 + s.r * 6)) * 0.18;
      const fd = (o.fleeDist ?? 12) * Math.max(0, flee - s.r * 0.45) * (0.6 + s.r2 * 0.8);
      const fx = s.x + Math.sin(s.r3 * 6.28) * (o.fleeSpread ?? 2.5) * Math.max(0, flee - s.r * 0.45), fz = s.z - fd;
      const sway = Math.sin(t * 1.3 + s.r * 9) * 0.03;
      E.set(lean, yaw + sway, 0); Q.setFromEuler(E);
      root.compose(V.set(fx * S, bob * S, fz * S), Q, SC.set(S, S, S));
      const P = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sc = 1) => { E.set(rx, ry, rz); Q.setFromEuler(E); part.compose(V.set(x, y, z), Q, SC.set(sc, sc, sc)); return M.multiplyMatrices(root, part); };
      set('body', i, P(0, 1.05, 0)); set('belt', i, P(0, 0.88, 0));
      set('legL', i, P(0.1, 0.72, 0, Math.sin(ph) * amp)); set('legR', i, P(-0.1, 0.72, 0, -Math.sin(ph) * amp));
      set('head', i, P(0, 1.55, 0.02)); set('helm', i, P(0, 1.6, 0.02)); set('brim', i, P(0, 1.6, 0.02, -0.08));
      const armSw = Math.sin(ph) * amp * 0.6;
      const up = cheer;
      set('armL', i, P(0.27, 1.3, 0, -armSw * (1 - up) - up * 2.6, 0, 0.15));
      set('armR', i, P(-0.27, 1.3, 0, armSw * (1 - up) - (charge * 1.1 + up * 2.6), 0, -0.15));
      if (o.shields !== false) set('shield', i, P(0.33, 1.05, 0.12, 0, 0.35, 0)); else set('shield', i, P(0, -50, 0, 0, 0, 0, 0.001));
      if (o.spears !== false) {
        const a = charge * 1.45 + (fl > 0.5 ? 0.6 : 0) - up * 0.15;   // lowered forward; fleeing drags spear
        set('spear', i, P(-0.32, 0.95, 0.08, a + Math.sin(ph) * 0.04 * amp, 0, 0.04));
        set('tip', i, P(-0.32, 0.95, 0.08, a + Math.sin(ph) * 0.04 * amp, 0, 0.04));
      } else { set('spear', i, P(0, -50, 0, 0, 0, 0, 0.001)); set('tip', i, P(0, -50, 0, 0, 0, 0, 0.001)); }
    });
    for (const k of PARTS) { const im = refs.current[k]; if (im) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); } }
  });
  // banners carried by evenly spread soldiers
  const nb = Math.min(o.banners ?? 0, n);
  const bannerIdx = useMemo(() => Array.from({ length: nb }, (_, k) => Math.floor((k + 0.5) * n / nb)), [nb, n]);
  if (vis < 0.5) return null;
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]}>
      {PARTS.map((k) => (
        <instancedMesh key={k} ref={(r) => { refs.current[k] = r; }} args={[(geos as any)[k], mats[k], n]} castShadow receiveShadow frustumCulled={false} />
      ))}
      {bannerIdx.map((idx, k) => {
        const s = soldiers[idx]; const fl = smooth(s.r * 0.45, s.r * 0.45 + 0.25, flee);
        const fd = (o.fleeDist ?? 12) * Math.max(0, flee - s.r * 0.45) * (0.6 + s.r2 * 0.8);
        const fx = s.x + Math.sin(s.r3 * 6.28) * (o.fleeSpread ?? 2.5) * Math.max(0, flee - s.r * 0.45);
        const tilt = fl * 35;
        return <Banner key={k} o={{ id: `${o.id}_b${k}`, pattern: o.pattern ?? 'cross', field: o.field, charge: o.charge, size: o.bannerSize ?? [1.1, 0.75], pole: 3.4, seed: k * 1.7,
          keys: [{ at: 0, pos: [(fx + 0.45) * S, 0.3 * S, (s.z - fd + 0.3) * S], rot: [tilt, fl > 0.5 ? 180 : 0, 0] }] }} />;
      })}
    </group>
  );
};

// ---------------------------------------------------------------- bucket (Secchia rapita)
type BucketSpec = { id: string; keys?: Key[]; h?: number; wood?: string; iron?: string; handle?: number; glow?: number; water?: boolean };
export const BucketMesh: React.FC<{ o: BucketSpec; handleAng?: number; glow?: number }> = ({ o, handleAng = 0, glow = 0 }) => {
  const H = o.h ?? 0.36, rb = H * 0.36, rt = H * 0.47;
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!;
    const base = new THREE.Color(o.wood ?? '#8a5a32');
    const n = 16;
    for (let k = 0; k < n; k++) {
      const shade = 0.82 + hr(k, 7) * 0.3; const col = base.clone().multiplyScalar(shade);
      g.fillStyle = `#${col.getHexString()}`; g.fillRect(k * 512 / n, 0, 512 / n, 128);
      g.strokeStyle = 'rgba(40,22,10,0.35)'; g.lineWidth = 1;
      for (let l = 0; l < 4; l++) { g.beginPath(); const x = k * 512 / n + 4 + hr(k * 9 + l, 3) * (512 / n - 8); g.moveTo(x, 0); g.bezierCurveTo(x + 3, 40, x - 3, 80, x + 2, 128); g.stroke(); }
      g.fillStyle = 'rgba(30,16,6,0.85)'; g.fillRect(k * 512 / n, 0, 2.5, 128);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
  }, [o.wood]);
  const outer = useMemo(() => new THREE.LatheGeometry([new THREE.Vector2(rb, 0), new THREE.Vector2(rt, H)], 40), [rb, rt, H]);
  const inner = useMemo(() => new THREE.LatheGeometry([new THREE.Vector2(rb * 0.9, H * 0.06), new THREE.Vector2(rt * 0.92, H)], 40), [rb, rt, H]);
  const iron = o.iron ?? '#2b2b2e';
  const hoop = (y: number) => { const r = rb + (rt - rb) * y + 0.006; return <mesh position={[0, y * H, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[r, H * 0.022, 6, 40]} /><meshStandardMaterial color={iron} metalness={0.7} roughness={0.45} /></mesh>; };
  return (
    <group>
      <mesh geometry={outer} castShadow receiveShadow><meshStandardMaterial map={tex} roughness={0.75} side={THREE.FrontSide} emissive={'#ffb347'} emissiveIntensity={glow * 0.25} /></mesh>
      <mesh geometry={inner}><meshStandardMaterial color="#3a2414" roughness={0.9} side={THREE.BackSide} /></mesh>
      <mesh position={[0, H * 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[rb * 0.9, 32]} /><meshStandardMaterial color={o.water ? '#3d6f8a' : '#2e1c10'} roughness={o.water ? 0.15 : 0.9} metalness={o.water ? 0.2 : 0} /></mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[(rt + rt * 0.92) / 2, H * 0.03, 6, 40]} /><meshStandardMaterial map={tex} color="#c79a6a" roughness={0.7} /></mesh>
      {hoop(0.14)}{hoop(0.52)}{hoop(0.88)}
      {/* lugs + arched iron handle */}
      {[1, -1].map((s) => <mesh key={s} position={[s * (rt + 0.01), H * 0.9, 0]} castShadow><boxGeometry args={[0.03, H * 0.22, 0.05]} /><meshStandardMaterial color={iron} metalness={0.7} roughness={0.45} /></mesh>)}
      <group position={[0, H * 0.95, 0]} rotation={[handleAng, 0, 0]}>
        <mesh castShadow><torusGeometry args={[rt + 0.012, H * 0.018, 6, 32, Math.PI]} /><meshStandardMaterial color={iron} metalness={0.7} roughness={0.45} /></mesh>
      </group>
    </group>
  );
};
export const Bucket: React.FC<{ o: BucketSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const sc = sample<number>(o.keys, 'scale', frame, 1);
  const hd = sample<number>(o.keys, 'handle', frame, o.handle ?? 0);
  const gl = sample<number>(o.keys, 'glow', frame, o.glow ?? 0);
  const vis = sample<number>(o.keys, 'visible', frame, 1);
  if (vis < 0.5 || sc < 0.001) return null;
  return <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={sc}><BucketMesh o={o} handleAng={hd * DEG} glow={gl} /></group>;
};

// ---------------------------------------------------------------- gallop (GLB rider)
type GallopSpec = { id: string; src: string; fit?: any; keys?: Key[]; rate?: number; bob?: number; pitch?: number; yawOffset?: number; tint?: string; phase?: number };
export const Gallop: React.FC<{ o: GallopSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const p = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const a = sample<number[]>(o.keys, 'pos', frame - 2, p), b = sample<number[]>(o.keys, 'pos', frame + 2, p);
  const dx = b[0] - a[0], dz = b[2] - a[2]; const moving = Math.hypot(dx, dz) > 0.02;
  const ryKey = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0])[1];
  const yaw = moving ? Math.atan2(dx, dz) : ryKey * DEG;
  const run = sample<number>(o.keys, 'run', frame, moving ? 1 : 0);
  const t = frame / 30 * (o.rate ?? 2.2) * Math.PI * 2 + (o.phase ?? 0);
  const bob = Math.abs(Math.sin(t)) * (o.bob ?? 0.18) * run;
  const pitch = Math.sin(t) * (o.pitch ?? 5) * DEG * run;
  const spec = useMemo(() => ({ id: o.id, src: o.src, fit: o.fit, tint: o.tint, keys: [{ at: 0, pos: [0, 0, 0], rot: [0, o.yawOffset ?? 0, 0] }] }), [o.id, o.src, JSON.stringify(o.fit), o.tint, o.yawOffset]);
  return <group position={[p[0], p[1] + bob, p[2]]} rotation={[0, yaw, 0]}><group rotation={[pitch, 0, 0]}><GLBModel spec={spec as any} /></group></group>;
};

// ---------------------------------------------------------------- soft spotlight cone
type ConeSpec = { id: string; keys?: Key[]; height?: number; radius?: number; color?: string; opacity?: number };
export const LightCone: React.FC<{ o: ConeSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const op = sample<number>(o.keys, 'opacity', frame, o.opacity ?? 0.25);
  const H = o.height ?? 6, R = o.radius ?? 1.4;
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { col: { value: new THREE.Color(o.color ?? '#fff1c8') }, op: { value: 0.25 } },
    vertexShader: 'varying float vy; varying vec3 vn; varying vec3 vv; void main(){ vy = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.); vn = normalize(normalMatrix*normal); vv = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 col; uniform float op; varying float vy; varying vec3 vn; varying vec3 vv; void main(){ float e = pow(abs(dot(vn, vv)), 1.5); gl_FragColor = vec4(col, op * e * smoothstep(0.0, 0.25, vy) * (0.35 + 0.65*vy)); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), [o.color]);
  mat.uniforms.op.value = op;
  if (op <= 0.001) return null;
  return <mesh position={[pos[0], pos[1] + H / 2, pos[2]]} material={mat}><cylinderGeometry args={[0.12, R, H, 40, 1, true]} /></mesh>;
};

// ---------------------------------------------------------------- kettle helmet (toon cast attach)
export const Helm: React.FC<{ o: { color?: string; size?: number; plume?: string } }> = ({ o }) => {
  const s = o.size ?? 1; const c = o.color ?? '#9aa3ad';
  return (
    <group scale={s}>
      <mesh castShadow><sphereGeometry args={[0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={c} metalness={0.75} roughness={0.32} /></mesh>
      <mesh position={[0, 0.0, 0]} rotation={[0, 0, 0]} castShadow><cylinderGeometry args={[0.44, 0.47, 0.035, 32]} /><meshStandardMaterial color={c} metalness={0.75} roughness={0.32} /></mesh>
      <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.04, 10, 8]} /><meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.3} /></mesh>
      {o.plume && <mesh position={[0, 0.36, -0.04]} rotation={[-0.5, 0, 0]}><coneGeometry args={[0.06, 0.28, 10]} /><meshStandardMaterial color={o.plume} roughness={0.9} /></mesh>}
    </group>
  );
};

export const MedievalAttach: React.FC<{ o: any }> = ({ o }) => {
  if (o.type === 'bucket') return <BucketMesh o={o} handleAng={(o.handle ?? 0) * DEG} glow={o.glow ?? 0} />;
  if (o.type === 'helm') return <Helm o={o} />;
  if (o.type === 'banner') return <Banner o={o} />;
  if (o.type === 'shieldprop') {
    const tex = heraldry(o.pattern ?? 'cross', o.field ?? '#ffffff', o.charge ?? '#c8102e', 128, 160, true);
    return <mesh castShadow><planeGeometry args={[0.5, 0.62]} /><meshStandardMaterial map={tex} alphaTest={0.5} side={THREE.DoubleSide} roughness={0.6} /></mesh>;
  }
  return null;
};
