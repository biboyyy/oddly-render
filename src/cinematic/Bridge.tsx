// Procedural structures for the cinematic engine (added for ep017 "Galloping Gertie"):
//  - bridge  : suspension bridge (towers, main cables, hangers, segmented deck) whose deck can
//              wave vertically / twist (torsion) with keyed amplitudes, snap hangers one by one and
//              drop deck chunks into the water with splashes; cars ride the deck (GLB) incl. a toon dog.
//  - terrain : heightfield strait (water channel along z, banks/bluffs both sides) + instanced fir forest.
//  - wind    : moving translucent wind streaks / smoke streamlines (instanced, additive).
//  - flutter : cross-section diagram of a deck section twisting with growing amplitude, wind arrows,
//              push arrow and an oscilloscope trace (canvas).
//  - sky     : gradient sky dome with procedural clouds + sun disc (no HDRI needed).
// Everything is a pure function of the frame (Remotion renders out of order).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { GLBModel } from './GLBModel';
import { DEG, Key, sample } from './tracks';

const hr = (n: number) => { const s = Math.sin(n * 127.1 + 0.37) * 43758.5453; return s - Math.floor(s); };
function vnoise(x: number, z: number, seed: number) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const h = (a: number, b: number) => hr(a * 157.31 + b * 311.73 + seed * 17.17);
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v;
}
function fbm(x: number, z: number, seed: number) {
  let a = 0, amp = 1, f = 1, tot = 0;
  for (let o = 0; o < 5; o++) { a += amp * vnoise(x * f, z * f, seed + o); tot += amp; amp *= 0.5; f *= 2.03; }
  return a / tot;
}
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const UP = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
function inst(geo: THREE.BufferGeometry, mat: THREE.Material, n: number, shadow = true) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return m;
}
/** matrix for a unit cylinder (radius 1, height 1, axis +y) spanning a->b */
function cylBetween(a: THREE.Vector3, b: THREE.Vector3, r: number, out: THREE.Matrix4) {
  const d = b.clone().sub(a); const len = d.length();
  if (len < 1e-4) return out.copy(ZERO);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.multiplyScalar(1 / len));
  return out.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(r, len, r));
}
const T = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
const S = (x: number, y: number, z: number) => new THREE.Matrix4().makeScale(x, y, z);
const mul = (...ms: THREE.Matrix4[]) => ms.reduce((acc, m) => acc.multiply(m), new THREE.Matrix4());

// ------------------------------------------------------------------ bridge
export type BridgeCar = { id?: string; src: string; x: number; lane?: number; speed?: number; until?: number; tint?: string; dog?: boolean;
  size?: number; yaw?: number; dogPos?: number[]; dogYaw?: number; roll?: number };
export type BridgeSpec = {
  type: 'bridge'; id: string; pos?: number[]; scale?: number; rotY?: number;
  span?: number; side?: number; deckY?: number; width?: number; towerTop?: number; sag?: number;
  segs?: number; sideSegs?: number; approach?: number;
  waveN?: number; waveHz?: number; twistHz?: number; travel?: number; twistLag?: number; cableK?: number;
  keys?: Key[]; // wave (m), twist (deg)
  collapse?: { at: number; dur?: number; s0?: number; s1?: number; chunk?: number; g?: number; delay?: number };
  cars?: BridgeCar[];
  style?: 'gertie' | 'modern';
  lamps?: boolean;
  colors?: { deck?: string; steel?: string; tower?: string; cable?: string; concrete?: string; road?: string };
  splash?: boolean;
};

type Seg = { x: number; len: number; s: number; main: boolean; chunk: number; snap: number };

const Dog: React.FC<{ t: number }> = ({ t }) => {
  // Tubby: small black cocker spaniel (primitive toon dog), looking around, ears swinging
  const yaw = Math.sin(t * 1.3) * 0.5 + Math.sin(t * 0.47) * 0.25;
  const bob = Math.sin(t * 3.1) * 0.012;
  const ear = Math.sin(t * 2.6) * 0.18;
  const fur = '#1c1612', fur2 = '#2e241d';
  return (
    <group>
      <mesh position={[0, 0.16, -0.05]} scale={[0.2, 0.2, 0.3]}><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color={fur} roughness={0.9} /></mesh>
      <group position={[0, 0.36 + bob, 0.1]} rotation={[0.1, yaw, 0]}>
        <mesh scale={[0.13, 0.13, 0.14]}><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color={fur} roughness={0.85} /></mesh>
        <mesh position={[0, -0.035, 0.125]} scale={[0.07, 0.062, 0.1]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#4a3426" roughness={0.8} /></mesh>
        <mesh position={[0, -0.01, 0.222]} scale={0.026}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#050505" roughness={0.25} /></mesh>
        <mesh position={[0, -0.085, 0.19]} scale={[0.022, 0.012, 0.03]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#c4566a" roughness={0.5} /></mesh>
        {[-1, 1].map((sd) => (
          <group key={sd}>
            <mesh position={[sd * 0.052, 0.035, 0.105]} scale={0.026}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color="#f2efe6" emissive="#ffffff" emissiveIntensity={0.35} /></mesh>
            <mesh position={[sd * 0.054, 0.035, 0.127]} scale={0.014}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#120c08" roughness={0.2} /></mesh>
            <mesh position={[sd * 0.058, 0.04, 0.138]} scale={0.005}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh position={[sd * 0.13, -0.09, -0.01]} rotation={[0, 0, sd * (0.18 + ear * sd)]} scale={[0.055, 0.17, 0.09]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color={fur2} roughness={1} /></mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

export const Bridge: React.FC<{ o: BridgeSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const modern = o.style === 'modern';
  const span = o.span ?? 853, side = o.side ?? 335, deckY = o.deckY ?? 59, w = o.width ?? (modern ? 18 : 12);
  const towerTop = o.towerTop ?? 130, sag = o.sag ?? 4, N = o.segs ?? 96, M = o.sideSegs ?? 24, approach = o.approach ?? 260;
  const waveN = o.waveN ?? 2, waveHz = o.waveHz ?? 0.45, twistHz = o.twistHz ?? 0.22, travel = o.travel ?? 0.5, lag = o.twistLag ?? 0.0;
  const g = o.collapse?.g ?? 20, cableK = o.cableK ?? 0.8;
  const C = { deck: '#8f8b82', steel: modern ? '#4f6e5c' : '#5f6d66', tower: modern ? '#4f6e5c' : '#66736b', cable: '#3f4744', concrete: '#9a958a', road: '#5b5853', ...(o.colors ?? {}) };
  const anchorX = span / 2 + side;

  // ---- static layout: segments, chunks, snap frames
  const segs = useMemo(() => {
    const out: Seg[] = [];
    const sl = side / M, ml = span / N;
    for (let i = 0; i < M; i++) out.push({ x: -anchorX + sl * (i + 0.5), len: sl, s: -1, main: false, chunk: -1, snap: 1e9 });
    for (let i = 0; i < N; i++) { const x = -span / 2 + ml * (i + 0.5); out.push({ x, len: ml, s: (x + span / 2) / span, main: true, chunk: -1, snap: 1e9 }); }
    for (let i = 0; i < M; i++) out.push({ x: span / 2 + sl * (i + 0.5), len: sl, s: -1, main: false, chunk: -1, snap: 1e9 });
    const c = o.collapse;
    let chunks: { idx: number[]; rel: number; hit: number; sign: number }[] = [];
    if (c) {
      const s0 = c.s0 ?? 0.15, s1 = c.s1 ?? 0.85, csz = c.chunk ?? 4, dur = (c.dur ?? 2) * fps, delay = c.delay ?? 6;
      const sel = out.map((sg, i) => [sg, i] as const).filter(([sg]) => sg.main && sg.s >= s0 && sg.s <= s1);
      const ordered = [...sel].sort((a, b) => Math.abs(a[0].s - 0.5) - Math.abs(b[0].s - 0.5));
      ordered.forEach(([sg], r) => { sg.snap = c.at + dur * (ordered.length > 1 ? r / (ordered.length - 1) : 0); });
      for (let k = 0; k < sel.length; k += csz) {
        const idx = sel.slice(k, k + csz).map(([, i]) => i);
        const rel = Math.max(...idx.map((i) => out[i].snap)) + delay;
        const ci = chunks.length;
        idx.forEach((i) => { out[i].chunk = ci; });
        const hit = rel + Math.sqrt((2 * deckY) / g) * fps;
        chunks.push({ idx, rel, hit, sign: out[idx[0]].s < 0.5 ? 1 : -1 });
      }
    }
    return { list: out, chunks };
  }, [span, side, N, M, deckY, g, fps, JSON.stringify(o.collapse ?? null)]);

  // ---- deck kinematics
  const ampAt = (f: number): [number, number] => [sample<number>(o.keys, 'wave', f, 0), sample<number>(o.keys, 'twist', f, 0) * DEG];
  const deckState = (x: number, f: number): [number, number] => {
    const s = (x + span / 2) / span;
    if (s <= 0 || s >= 1) return [0, 0];
    const t = f / fps; const [Av, At] = ampAt(f);
    const wv = 2 * Math.PI * waveHz, wt = 2 * Math.PI * twistHz;
    const v = Av * ((1 - travel) * Math.sin(waveN * Math.PI * s) * Math.sin(wv * t) + travel * Math.sin(waveN * Math.PI * s - wv * t) * Math.sin(Math.PI * s));
    const th = At * Math.sin(2 * Math.PI * s) * Math.sin(wt * t - lag * s);
    return [v, th];
  };
  const deckMat = (x: number, f: number) => {
    const [v, th] = deckState(x, f);
    const v2 = deckState(x + 2, f)[0], v1 = deckState(x - 2, f)[0];
    const m = new THREE.Matrix4().makeRotationZ(Math.atan((v2 - v1) / 4)).multiply(new THREE.Matrix4().makeRotationX(th));
    m.setPosition(x, deckY + v, 0);
    return m;
  };
  const chunkMat = (ci: number, f: number) => {
    const ch = segs.chunks[ci];
    if (f <= ch.rel) return null;
    const tau = (f - ch.rel) / fps;
    const cx = segs.list[ch.idx[Math.floor(ch.idx.length / 2)]].x;
    const c0 = deckMat(cx, ch.rel); const cpos = new THREE.Vector3().setFromMatrixPosition(c0);
    const drop = 0.5 * g * tau * tau;
    const R = new THREE.Matrix4().makeRotationZ(ch.sign * tau * 0.35).multiply(new THREE.Matrix4().makeRotationX(ch.sign * tau * 0.5));
    return { M: mul(T(cpos.x, cpos.y - drop, cpos.z), R, T(-cpos.x, -cpos.y, -cpos.z)), y: cpos.y - drop };
  };
  const segIndex = (x: number) => segs.list.findIndex((sg) => Math.abs(x - sg.x) <= sg.len / 2 + 1e-6);
  /** deck frame at an arbitrary x (follows falling chunks) */
  const deckAt = (x: number, f: number) => {
    const i = segIndex(x);
    const sg = i >= 0 ? segs.list[i] : null;
    if (sg && sg.chunk >= 0) { const cm = chunkMat(sg.chunk, f); if (cm) return cm.M.clone().multiply(deckMat(x, segs.chunks[sg.chunk].rel)); }
    return deckMat(x, f);
  };
  const relFrac = segs.chunks.length ? segs.chunks.filter((c) => frame > c.rel).length / segs.chunks.length : 0;
  const cableY = (x: number, f: number) => {
    const ax = Math.abs(x);
    if (ax <= span / 2) {
      const u = x / (span / 2);
      const s = (x + span / 2) / span;
      return deckY + sag + (towerTop - deckY - sag) * u * u + cableK * deckState(x, f)[0] * (1 - relFrac) + 9 * relFrac * Math.sin(Math.PI * s);
    }
    const u = Math.min(1, (ax - span / 2) / side);
    return towerTop + (deckY + 1.5 - towerTop) * u - side * 0.03 * 4 * u * (1 - u);
  };

  // ---- instanced meshes
  const mats = useMemo(() => ({
    deck: new THREE.MeshStandardMaterial({ color: C.deck, roughness: 0.92 }),
    steel: new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.55, metalness: 0.35 }),
    cable: new THREE.MeshStandardMaterial({ color: C.cable, roughness: 0.5, metalness: 0.5 }),
    white: new THREE.MeshStandardMaterial({ color: '#e8e4d8', roughness: 0.7 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff1c8', emissive: '#ffd890', emissiveIntensity: 0.8 }),
  }), [C.deck, C.steel, C.cable]);
  const n = segs.list.length;
  const geos = useMemo(() => ({ box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 7, 1) }), []);
  const meshes = useMemo(() => ({
    slab: inst(geos.box, mats.deck, n),
    girder: inst(geos.box, mats.steel, n * (modern ? 10 : 4)),
    dash: inst(geos.box, mats.white, n, false),
    hanger: inst(geos.cyl, mats.cable, n * 2),
    cable: inst(geos.cyl, mats.cable, (n + 2) * 2),
    pole: inst(geos.box, mats.steel, n * 2),
    lamp: inst(geos.box, mats.lamp, n * 2, false),
  }), [n, modern, mats, geos]);

  const ST = modern ? 0.5 : 0.35;      // slab thickness
  const GD = modern ? 7.5 : 2.45;      // girder / truss depth
  const counters = { girder: 0, hanger: 0, cable: 0, pole: 0, lamp: 0 };
  const setM = (key: keyof typeof meshes, i: number, m: THREE.Matrix4) => meshes[key].setMatrixAt(i, m);
  const segMats: THREE.Matrix4[] = [];
  segs.list.forEach((sg, i) => {
    let Mseg: THREE.Matrix4;
    let sunk = false;
    if (sg.chunk >= 0) {
      const cm = chunkMat(sg.chunk, frame);
      if (cm) { Mseg = cm.M.clone().multiply(deckMat(sg.x, segs.chunks[sg.chunk].rel)); sunk = cm.y < -25; } else Mseg = deckMat(sg.x, frame);
    } else Mseg = deckMat(sg.x, frame);
    segMats.push(Mseg);
    const L = sg.len * 1.02;
    const put = (key: keyof typeof meshes, idx: number, local: THREE.Matrix4) => setM(key, idx, sunk ? ZERO : Mseg.clone().multiply(local));
    put('slab', i, mul(T(0, 0, 0), S(L, ST, w)));
    put('dash', i, mul(T(0, ST / 2 + 0.03, 0), S(sg.len * 0.45, 0.03, 0.22)));
    for (const sd of [-1, 1]) {
      if (!modern) {
        put('girder', counters.girder++, mul(T(0, -GD / 2 + ST / 2, sd * w / 2), S(L, GD, 0.3)));
        put('girder', counters.girder++, mul(T(0, 0.65, sd * (w / 2 - 0.15)), S(L, 0.12, 0.12)));
      } else {
        put('girder', counters.girder++, mul(T(0, 0.4, sd * w / 2), S(L, 0.7, 0.7)));
        put('girder', counters.girder++, mul(T(0, -GD, sd * w / 2), S(L, 0.7, 0.7)));
        put('girder', counters.girder++, mul(T(-sg.len / 2, -GD / 2, sd * w / 2), S(0.5, GD, 0.5)));
        const ang = Math.atan2(GD, sg.len) * (i % 2 ? 1 : -1);
        put('girder', counters.girder++, mul(T(0, -GD / 2, sd * w / 2), new THREE.Matrix4().makeRotationZ(ang), S(Math.hypot(GD, sg.len), 0.4, 0.4)));
        put('girder', counters.girder++, mul(T(0, -GD, 0), S(0.4, 0.4, w)));
      }
      // lamp posts every 6th segment
      if (o.lamps !== false && i % 6 === 3) {
        put('pole', counters.pole++, mul(T(0, 3.2, sd * (w / 2 - 0.35)), S(0.16, 6.4, 0.16)));
        put('lamp', counters.lamp++, mul(T(0, 6.4, sd * (w / 2 - 1.0)), S(1.5, 0.22, 0.4)));
      }
      // hangers
      const top = new THREE.Vector3(sg.x, cableY(sg.x, frame), sd * w / 2);
      const bot = new THREE.Vector3(0, 0.5, sd * w / 2).applyMatrix4(Mseg);
      if (frame < sg.snap) {
        meshes.hanger.setMatrixAt(counters.hanger++, top.y - bot.y > 0.3 ? cylBetween(top, bot, 0.16, new THREE.Matrix4()) : ZERO);
      } else {
        const tau = (frame - sg.snap) / fps;
        const L0 = Math.max(0.5, top.y - deckY);
        const len = L0 * Math.max(0.22, 1 - tau * 2.2);
        const sw = 0.9 * Math.sin(tau * 7 + i) * Math.exp(-tau * 1.2);
        const end = top.clone().add(new THREE.Vector3(Math.sin(sw) * 0.6, -Math.cos(sw), Math.sin(sw) * 0.8 * sd).normalize().multiplyScalar(len));
        meshes.hanger.setMatrixAt(counters.hanger++, cylBetween(top, end, 0.16, new THREE.Matrix4()));
      }
    }
  });
  // cables
  {
    const xs: number[] = [-anchorX - 30, ...segs.list.map((sg) => sg.x), anchorX + 30];
    xs.sort((a, b) => a - b);
    for (const sd of [-1, 1]) {
      for (let k = 0; k < xs.length - 1; k++) {
        const ya = Math.abs(xs[k]) > anchorX ? deckY - 6 : cableY(xs[k], frame);
        const yb = Math.abs(xs[k + 1]) > anchorX ? deckY - 6 : cableY(xs[k + 1], frame);
        meshes.cable.setMatrixAt(counters.cable++, cylBetween(new THREE.Vector3(xs[k], ya, sd * w / 2), new THREE.Vector3(xs[k + 1], yb, sd * w / 2), 0.42, new THREE.Matrix4()));
      }
    }
  }
  for (const [k, m] of Object.entries(meshes)) {
    const used = k === 'slab' || k === 'dash' ? n : (counters as any)[k];
    m.count = Math.max(0, used);
    m.instanceMatrix.needsUpdate = true;
  }

  // ---- towers, piers, anchorages, approaches (static)
  const towerEls: React.ReactNode[] = [];
  for (const sx of [-1, 1]) {
    const x = sx * span / 2;
    const legZ = w / 2 + 1.6;
    towerEls.push(<mesh key={`pier${sx}`} position={[x, -6, 0]} castShadow receiveShadow><boxGeometry args={[22, 20, w + 16]} /><meshStandardMaterial color={C.concrete} roughness={0.95} /></mesh>);
    for (const sz of [-1, 1]) {
      towerEls.push(<mesh key={`leg${sx}${sz}`} position={[x, (towerTop + 4) / 2, sz * legZ]} castShadow receiveShadow><boxGeometry args={[modern ? 6 : 4.5, towerTop + 4, modern ? 4.5 : 3.4]} /><meshStandardMaterial color={C.tower} roughness={0.6} metalness={0.3} /></mesh>);
      towerEls.push(<mesh key={`saddle${sx}${sz}`} position={[x, towerTop + 3.5, sz * legZ]} castShadow><boxGeometry args={[7, 3, 4.2]} /><meshStandardMaterial color={C.tower} roughness={0.5} metalness={0.3} /></mesh>);
    }
    const struts = modern ? [deckY - 9, deckY + 22, deckY + 46, towerTop - 2] : [deckY - 4, deckY + 26, deckY + 50, towerTop - 1];
    struts.forEach((y, k) => towerEls.push(
      <mesh key={`strut${sx}${k}`} position={[x, y, 0]} castShadow receiveShadow><boxGeometry args={[3.6, k === 0 ? 3 : 2.2, 2 * legZ]} /><meshStandardMaterial color={C.tower} roughness={0.6} metalness={0.3} /></mesh>));
    // X bracing between struts (gertie style lattice look)
    for (let k = 1; k < struts.length - 1; k++) {
      const y0 = struts[k], y1 = struts[k + 1], h = y1 - y0, d = 2 * legZ;
      const a = Math.atan2(h, d), L = Math.hypot(h, d);
      for (const sgn of [-1, 1]) towerEls.push(
        <mesh key={`x${sx}${k}${sgn}`} position={[x, (y0 + y1) / 2, 0]} rotation={[sgn * a, 0, 0]} castShadow><boxGeometry args={[1.2, 1.2, L]} /><meshStandardMaterial color={C.tower} roughness={0.6} metalness={0.3} /></mesh>);
    }
    // anchorage + approach road
    const ax = sx * anchorX;
    towerEls.push(<mesh key={`anch${sx}`} position={[ax + sx * 10, deckY - 14.2, 0]} castShadow receiveShadow><boxGeometry args={[34, 26, w + 14]} /><meshStandardMaterial color={C.concrete} roughness={0.95} /></mesh>);
    towerEls.push(<mesh key={`appr${sx}`} position={[ax + sx * (approach / 2), deckY - 0.1, 0]} receiveShadow castShadow><boxGeometry args={[approach, 0.5, w]} /><meshStandardMaterial color={C.road} roughness={0.95} /></mesh>);
    for (const sz of [-1, 1]) towerEls.push(<mesh key={`apr${sx}${sz}`} position={[ax + sx * (approach / 2), deckY + 0.6, sz * (w / 2 - 0.15)]} castShadow><boxGeometry args={[approach, 0.12, 0.12]} /><meshStandardMaterial color={C.steel} /></mesh>);
  }

  // ---- cars
  const t = frame / fps;
  const cars = (o.cars ?? []).map((c, k) => {
    const fStop = Math.min(frame, c.until ?? 1e9);
    const x = c.x + (c.speed ?? 0) * (fStop / fps);
    const Md = deckAt(x, frame).multiply(T(0, ST / 2, c.lane ?? -2.4)).multiply(new THREE.Matrix4().makeRotationX((c.roll ?? 0) * DEG));
    const yaw = c.yaw ?? ((c.speed ?? 0) >= 0 ? 90 : -90);
    const moving = (c.speed ?? 0) !== 0 && frame < (c.until ?? 1e9);
    return (
      <group key={c.id ?? `car${k}`} matrixAutoUpdate={false} matrix={Md}>
        <group rotation={[0, yaw * DEG, 0]}>
          <GLBModel spec={{ id: c.id ?? `car${k}`, src: c.src, fit: { size: c.size ?? 4.6 }, tint: c.tint, clips: moving ? [{ name: 'wheel-roll', at: 0, speed: Math.abs(c.speed ?? 0) / 8 }] : [] }} />
          {c.dog && <group position={(c.dogPos ?? [0.35, 0.55, -0.55]) as any} rotation={[0, (c.dogYaw ?? 90) * DEG, 0]}><Dog t={t} /></group>}
        </group>
      </group>
    );
  });

  // ---- splashes
  const splashes = o.splash === false ? null : segs.chunks.map((ch, ci) => {
    const tau = (frame - ch.hit) / fps;
    if (tau < 0 || tau > 3.2) return null;
    const cx = segs.list[ch.idx[Math.floor(ch.idx.length / 2)]].x;
    return <Splash key={`sp${ci}`} pos={[cx, 0, 0]} tau={tau} seed={ci} width={ch.idx.length * span / N} />;
  });

  const pos = o.pos ?? [0, 0, 0];
  return (
    <group position={pos as any} scale={o.scale ?? 1} rotation={[0, (o.rotY ?? 0) * DEG, 0]}>
      {Object.entries(meshes).map(([k, m]) => <primitive key={k} object={m} />)}
      {towerEls}
      {cars}
      {splashes}
    </group>
  );
};

let _soft: THREE.Texture | null = null;
const softTex = () => {
  if (_soft) return _soft;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g2 = c.getContext('2d')!; const gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
  _soft = new THREE.CanvasTexture(c); return _soft;
};

/** water impact: spray column + droplets + expanding foam ring (tau = seconds since impact) */
const Splash: React.FC<{ pos: number[]; tau: number; seed: number; width: number }> = ({ pos, tau, seed, width }) => {
  const tex = softTex();
  const parts: React.ReactNode[] = [];
  const n = 90;
  for (let k = 0; k < n; k++) {
    const r1 = hr(seed * 91 + k), r2 = hr(seed * 37 + k * 3), r3 = hr(seed * 13 + k * 7);
    const vy = 14 + r1 * 34, vx = (r2 - 0.5) * 12, vz = (r3 - 0.5) * 18;
    const x0 = (hr(k * 5 + seed) - 0.5) * width;
    const y = Math.max(0, vy * tau - 0.5 * 9.8 * tau * tau);
    // ep017 v2: smaller, faster-fading droplets -> reads as a spray column, not a flat fog bank
    const sz = 2.5 + tau * 5 * (0.5 + r2);
    const op = Math.max(0, 0.6 * (1 - tau / 2.6)) * Math.min(1, tau * 8) * (y > 0 ? 1 : 0.4);
    parts.push(<sprite key={k} position={[pos[0] + x0 + vx * tau, y + 1, vz * tau]} scale={[sz, sz, 1]}><spriteMaterial map={tex} color="#eef3f5" transparent depthWrite={false} opacity={op} /></sprite>);
  }
  const ring = 6 + tau * 22;
  return (
    <group>
      {parts}
      <mesh position={[pos[0], 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[ring + width * 0.5, ring, 1]}>
        <ringGeometry args={[0.7, 1, 48]} />
        <meshBasicMaterial color="#f2f6f6" transparent opacity={Math.max(0, 0.7 * (1 - tau / 3.2))} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------ terrain + forest
export type TerrainSpec = { type: 'terrain'; id: string; size?: number; res?: number; channel?: number; bank?: number; height?: number; rough?: number;
  roadX?: number; roadY?: number; roadW?: number; seed?: number; trees?: number; treeMin?: number; treeX?: number; clearing?: number; colors?: { rock?: string; grass?: string; forest?: string; sand?: string; tree?: string[] }; pos?: number[]; flat?: boolean };
export const terrainHeight = (o: TerrainSpec, x: number, z: number) => {
  const ch = (o.channel ?? 470) + 60 * Math.sin(z / 380 + 1.3) + 35 * Math.sin(z / 170);
  const d = Math.abs(x) - ch;
  const H = o.height ?? 95, bank = o.bank ?? 240, seed = o.seed ?? 3;
  let h = -30 + (H + 30) * smooth(-90, bank, d);
  h += (o.rough ?? 28) * (fbm(x / 260, z / 260, seed) - 0.5) * smooth(-60, 120, d);
  h += 14 * (fbm(x / 70, z / 70, seed + 9) - 0.5) * smooth(-20, 60, d);
  const rX = o.roadX ?? 1e9, rY = o.roadY ?? 58, rW = o.roadW ?? 14;
  if (Math.abs(x) > rX - 60) {
    const k = smooth(rW + 70, rW + 4, Math.abs(z)) * smooth(rX - 60, rX - 10, Math.abs(x));
    h = h * (1 - k) + (rY - 0.8) * k;
  }
  return h;
};
export const Terrain: React.FC<{ o: TerrainSpec }> = ({ o }) => {
  const { geo, trees } = useMemo(() => {
    const size = o.size ?? 5200, res = o.res ?? 200;
    const g2 = new THREE.PlaneGeometry(size, size, res, res);
    g2.rotateX(-Math.PI / 2);
    const p = g2.attributes.position as THREE.BufferAttribute;
    const cols = new Float32Array(p.count * 3);
    const cc = { rock: new THREE.Color(o.colors?.rock ?? '#5e5b52'), grass: new THREE.Color(o.colors?.grass ?? '#4d6136'), forest: new THREE.Color(o.colors?.forest ?? '#2f3f26'), sand: new THREE.Color(o.colors?.sand ?? '#7d7462') };
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const h = terrainHeight(o, x, z);
      p.setY(i, h);
      const sl = Math.abs(terrainHeight(o, x + 6, z) - h) / 6;
      const nz = fbm(x / 40, z / 40, 21);
      let c = h < 3 ? cc.sand.clone() : sl > 0.7 ? cc.rock.clone() : cc.forest.clone().lerp(cc.grass, Math.max(0, nz - 0.35) * 1.6);
      if (h > 3 && h < 10) c = cc.rock.clone().lerp(c, (h - 3) / 7);
      c.multiplyScalar(0.85 + 0.3 * nz);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g2.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g2.computeVertexNormals();
    // forest (two stacked cones per fir), instanced
    const nT = o.trees ?? 3500;
    const cone = new THREE.ConeGeometry(1, 1, 7, 1); cone.translate(0, 0.5, 0);
    const matT = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
    const A = inst(cone, matT, nT), B = inst(cone, matT, nT);
    const tcols = (o.colors?.tree ?? ['#24361f', '#2c4226', '#1e2f1c', '#33492a', '#3a4a2e']).map((s) => new THREE.Color(s));
    let k = 0, tries = 0;
    const half = (o.size ?? 5200) / 2 * 0.9;
    while (k < nT && tries < nT * 8) {
      tries++;
      const xin = o.treeX ?? 0, ax = xin + hr(tries * 3.1 + 1) * (half - xin);
      const x = (hr(tries * 5.3 + 7) < 0.5 ? -1 : 1) * ax, z = (hr(tries * 7.7 + 2) - 0.5) * 2 * half;
      const h = terrainHeight(o, x, z);
      if (h < (o.treeMin ?? 9)) continue;
      const rX = o.roadX ?? 1e9, rW = o.roadW ?? 14;
      if (Math.abs(x) > rX - 80 && Math.abs(z) < rW + 22) continue;
      if (fbm(x / 120, z / 120, 5) < (o.clearing ?? 0.36)) continue; // clearings
      const th = 16 + hr(tries) * 18, r = th * (0.2 + hr(tries + 4) * 0.06);
      const col = tcols[Math.floor(hr(tries + 9) * tcols.length)];
      A.setMatrixAt(k, new THREE.Matrix4().compose(new THREE.Vector3(x, h - 1, z), new THREE.Quaternion(), new THREE.Vector3(r, th * 0.75, r)));
      B.setMatrixAt(k, new THREE.Matrix4().compose(new THREE.Vector3(x, h - 1 + th * 0.42, z), new THREE.Quaternion(), new THREE.Vector3(r * 0.7, th * 0.6, r * 0.7)));
      A.setColorAt(k, col); B.setColorAt(k, col.clone().multiplyScalar(1.12));
      k++;
    }
    A.count = k; B.count = k;
    return { geo: g2, trees: [A, B] };
  }, [JSON.stringify(o)]);
  return (
    <group position={(o.pos ?? [0, 0, 0]) as any}>
      <mesh geometry={geo} receiveShadow castShadow={false}><meshStandardMaterial vertexColors roughness={0.97} /></mesh>
      {trees.map((m, i) => <primitive key={i} object={m} />)}
    </group>
  );
};

// ------------------------------------------------------------------ wind streaks / smoke streamlines
export type WindSpec = { type: 'wind'; id: string; center?: number[]; box?: number[]; dir?: number[]; speed?: number; count?: number; len?: number; thick?: number; color?: string; opacity?: number; keys?: Key[]; wobble?: number; additive?: boolean };
export const Wind: React.FC<{ o: WindSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = o.count ?? 220;
  const mesh = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending, toneMapped: false });
    const m = inst(new THREE.BoxGeometry(1, 1, 1), mat, n, false);
    m.setColorAt(0, new THREE.Color('#fff'));
    return m;
  }, [n, o.additive]);
  const op = sample<number>(o.keys, 'opacity', frame, o.opacity ?? 0.35);
  (mesh.material as THREE.MeshBasicMaterial).opacity = op;
  const [bx, by, bz] = o.box ?? [200, 60, 200];
  const c = o.center ?? [0, 0, 0];
  const dir = new THREE.Vector3(...((o.dir ?? [0, 0, 1]) as [number, number, number])).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  const Lb = Math.abs(dir.x) * bx + Math.abs(dir.y) * by + Math.abs(dir.z) * bz;
  const t = frame / fps, v = o.speed ?? 18, base = new THREE.Color(o.color ?? '#dfe8f0');
  for (let k = 0; k < n; k++) {
    const r0 = hr(k + 1.5), r1 = hr(k * 2.3 + 4), r2 = hr(k * 4.1 + 9), r3 = hr(k * 6.7 + 3);
    const ph = (((r0 * Lb + t * v * (0.7 + 0.6 * r3)) % Lb) + Lb) % Lb; // 0..Lb along dir
    const p = new THREE.Vector3(c[0] + (r1 - 0.5) * bx, c[1] + (r2 - 0.5) * by, c[2] + (hr(k * 9.3) - 0.5) * bz);
    // project the random point onto the plane orthogonal to dir, then move along dir
    const along = p.clone().sub(new THREE.Vector3(...(c as [number, number, number]))).dot(dir);
    p.addScaledVector(dir, -along + ph - Lb / 2);
    p.y += Math.sin(t * 1.7 + k) * (o.wobble ?? 0.6);
    const L = (o.len ?? 14) * (0.5 + r3), th = (o.thick ?? 0.12) * (0.6 + r1 * 0.8);
    mesh.setMatrixAt(k, new THREE.Matrix4().compose(p, q, new THREE.Vector3(L, th, th)));
    const fade = Math.sin(Math.PI * (ph / Lb));
    mesh.setColorAt(k, base.clone().multiplyScalar(fade));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ------------------------------------------------------------------ flutter diagram
export type FlutterSpec = { type: 'flutter'; id: string; pos?: number[]; rotY?: number; scale?: number; at?: number; a0?: number; amax?: number; grow?: number; hz?: number;
  arrowsAt?: number; pushAt?: number; energyAt?: number; scope?: { pos: number[]; size: number[]; at?: number; title?: string }; length?: number; color?: string;
  keys?: Key[]; arrowFrom?: number; arrowRun?: number };
export const Flutter: React.FC<{ o: FlutterSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t0 = (o.at ?? 0) / fps, hz = o.hz ?? 0.5, a0 = (o.a0 ?? 3) * DEG, amax = (o.amax ?? 34) * DEG, grow = o.grow ?? 0.35;
  const theta = (f: number) => { const tt = f / fps; const A = tt < t0 ? a0 : Math.min(amax, a0 * Math.exp(grow * (tt - t0))); return A * Math.sin(2 * Math.PI * hz * tt); };
  const th = theta(frame), dth = (theta(frame + 1) - theta(frame - 1)) / 2 * fps;
  const L = o.length ?? 26, W = 12;
  const steel = o.color ?? '#7d8c84';
  const tt = frame / fps;
  const energy = o.energyAt !== undefined && frame >= o.energyAt ? Math.min(1, Math.abs(dth) / 0.9) : 0;
  // scope canvas
  const scope = useMemo(() => {
    if (!o.scope) return null;
    const c = document.createElement('canvas'); c.width = 1024; c.height = 560;
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    return { c, tx };
  }, [!!o.scope]);
  if (scope && o.scope) {
    const g2 = scope.c.getContext('2d')!; const Wc = scope.c.width, Hc = scope.c.height;
    g2.fillStyle = 'rgba(8,18,32,0.92)'; g2.fillRect(0, 0, Wc, Hc);
    g2.strokeStyle = '#2a4466'; g2.lineWidth = 2;
    for (let k = 1; k < 8; k++) { g2.beginPath(); g2.moveTo(k * Wc / 8, 90); g2.lineTo(k * Wc / 8, Hc - 20); g2.stroke(); }
    g2.beginPath(); g2.moveTo(30, (Hc + 70) / 2); g2.lineTo(Wc - 20, (Hc + 70) / 2); g2.strokeStyle = '#5a7ca8'; g2.stroke();
    g2.fillStyle = '#ffd34d'; g2.font = '900 54px Montserrat, sans-serif'; g2.textAlign = 'left'; g2.textBaseline = 'middle';
    g2.fillText(o.scope.title ?? 'SUDUT PUNTIR DEK', 34, 48);
    const sAt = o.scope.at ?? 0, win = 8; // seconds shown
    const tEnd = tt, tBeg = Math.max(0, tEnd - win);
    g2.beginPath(); g2.lineWidth = 7; g2.strokeStyle = '#7fe0ff'; g2.shadowColor = '#7fe0ff'; g2.shadowBlur = 14;
    let first = true;
    for (let k = 0; k <= 300; k++) {
      const ts = tBeg + (tEnd - tBeg) * k / 300; if (tEnd - tBeg <= 0) break;
      const xx = 30 + (Wc - 60) * ((ts - tBeg) / win);
      const yy = (Hc + 70) / 2 - (theta(ts * fps) / amax) * (Hc - 140) / 2;
      if (first) { g2.moveTo(xx, yy); first = false; } else g2.lineTo(xx, yy);
    }
    g2.stroke(); g2.shadowBlur = 0;
    scope.tx.needsUpdate = true;
  }
  // wind arrows marching toward the windward edge (from -x)
  const arrows: React.ReactNode[] = [];
  if (o.arrowsAt !== undefined && frame >= o.arrowsAt) {
    const k0 = Math.min(1, (frame - o.arrowsAt) / 12);
    for (let r = 0; r < 5; r++) for (let j = 0; j < 3; j++) {
      const y = -4 + r * 2;
      const ph = ((tt * 0.55 + j / 3 + r * 0.13) % 1);
      const x = (o.arrowFrom ?? -24) + ph * (o.arrowRun ?? 16);
      const op = k0 * Math.sin(Math.PI * ph);
      arrows.push(
        <group key={`a${r}${j}`} position={[x, y, L / 2 + 1.5]}>
          <mesh rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[0.16, 0.16, 2.6, 10]} /><meshBasicMaterial color="#8fd8ff" transparent opacity={op} toneMapped={false} /></mesh>
          <mesh position={[1.75, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.45, 0.9, 12]} /><meshBasicMaterial color="#8fd8ff" transparent opacity={op} toneMapped={false} /></mesh>
        </group>);
    }
  }
  // push arrow at the windward edge, along the edge's motion (energy input)
  let push: React.ReactNode = null;
  if (o.pushAt !== undefined && frame >= o.pushAt) {
    const ex = -W / 2 * Math.cos(th), ey = -W / 2 * Math.sin(th);
    const vy = -W / 2 * Math.cos(th) * dth;
    const mag = Math.min(1, Math.abs(vy) / 4.5);
    const sgn = Math.sign(vy) || 1;
    const len = 0.6 + 2.0 * mag;
    push = (
      <group position={[ex, ey + sgn * 1.0, L / 2 + 2]}>
        <mesh position={[0, sgn * len / 2, 0]}><cylinderGeometry args={[0.24, 0.24, len, 12]} /><meshBasicMaterial color="#ffd34d" toneMapped={false} transparent opacity={0.25 + 0.75 * mag} /></mesh>
        <mesh position={[0, sgn * (len + 0.5), 0]} rotation={[sgn > 0 ? 0 : Math.PI, 0, 0]}><coneGeometry args={[0.65, 1.1, 14]} /><meshBasicMaterial color="#ffd34d" toneMapped={false} transparent opacity={0.25 + 0.75 * mag} /></mesh>
      </group>);
  }
  const glow = new THREE.Color('#ff8a2a').multiplyScalar(energy * 0.35);
  const ksc = sample<number>(o.keys, 'scale', frame, 1);
  if (ksc < 1e-3) return null;
  return (
    <group position={(o.pos ?? [0, 0, 0]) as any} rotation={[0, (o.rotY ?? 0) * DEG, 0]} scale={(o.scale ?? 1) * ksc}>
      <group rotation={[0, 0, th]}>
        <mesh castShadow receiveShadow><boxGeometry args={[W, 0.5, L]} /><meshStandardMaterial color="#a39f95" roughness={0.85} emissive={glow} /></mesh>
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[sd * W / 2, -1.1, 0]} castShadow receiveShadow><boxGeometry args={[0.45, 2.6, L]} /><meshStandardMaterial color={steel} roughness={0.5} metalness={0.35} emissive={glow} /></mesh>
        ))}
        <mesh position={[0, 0.27, 0]}><boxGeometry args={[0.25, 0.04, L * 0.98]} /><meshStandardMaterial color="#f0ead8" /></mesh>
        {/* axis marker */}
        <mesh position={[0, 0, L / 2 + 0.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.5, 0.5, 0.6, 18]} /><meshBasicMaterial color="#ff5a5f" toneMapped={false} /></mesh>
      </group>
      {/* faint reference line (rest position) */}
      <mesh position={[0, 0, L / 2 + 0.2]}><boxGeometry args={[W * 1.5, 0.08, 0.08]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.45} /></mesh>
      {arrows}
      {push}
      {scope && o.scope && (
        <mesh position={o.scope.pos as any}><planeGeometry args={o.scope.size as any} /><meshBasicMaterial map={scope.tx} toneMapped={false} transparent opacity={Math.min(1, Math.max(0, (frame - (o.scope.at ?? 0)) / 10))} /></mesh>
      )}
    </group>
  );
};

// ------------------------------------------------------------------ sky dome
export type SkySpec = { type: 'sky'; id: string; top?: string; horizon?: string; bottom?: string; sun?: number[]; sunColor?: string; sunSize?: number; clouds?: number; cloudColor?: string; radius?: number; drift?: number; mid?: string; midAt?: number; cloudShade?: string };
export const Sky: React.FC<{ o: SkySpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color(o.top ?? '#7d8890') }, hor: { value: new THREE.Color(o.horizon ?? '#b9c0c4') }, bot: { value: new THREE.Color(o.bottom ?? '#6d767c') },
      sunDir: { value: new THREE.Vector3(...((o.sun ?? [0.3, 0.15, -1]) as [number, number, number])).normalize() }, sunCol: { value: new THREE.Color(o.sunColor ?? '#fff2d0') },
      sunSize: { value: o.sunSize ?? 0 }, clouds: { value: o.clouds ?? 0.6 }, cloudCol: { value: new THREE.Color(o.cloudColor ?? '#d6dadc') }, time: { value: 0 },
      mid: { value: new THREE.Color(o.mid ?? o.horizon ?? '#b9c0c4') }, midAt: { value: o.mid ? (o.midAt ?? 0.12) : -1 }, shade: { value: new THREE.Color(o.cloudShade ?? o.cloudColor ?? '#d6dadc') },
    },
    vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunSize; uniform float clouds; uniform vec3 cloudCol; uniform float time; uniform vec3 mid; uniform float midAt; uniform vec3 shade; varying vec3 vd;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
      float fbm(vec2 p){ float a=0., s=.5; for(int k=0;k<5;k++){ a+=s*n(p); p*=2.03; s*=.5; } return a; }
      void main(){ vec3 d = normalize(vd); float y = d.y;
        vec3 c = y > 0. ? mix(hor, top, pow(clamp(y,0.,1.), 0.55)) : mix(hor, bot, pow(clamp(-y,0.,1.), 0.4));
        if (midAt > 0. && y > 0.) c = y < midAt ? mix(hor, mid, smoothstep(0., 1., y / midAt)) : mix(mid, top, pow(clamp((y - midAt) / (1. - midAt), 0., 1.), 0.6));
        if (y > 0.0) { vec2 uv = d.xz / (y + 0.12) * 1.6 + vec2(time, time*0.3); float cl = smoothstep(0.42, 0.78, fbm(uv)); float lit = fbm(uv*2.0 + vec2(0.0, 0.35)); c = mix(c, mix(shade, cloudCol, smoothstep(0.35, 0.7, lit)), cl * clouds * smoothstep(0.0, 0.08, y)); }
        float sd = max(dot(d, sunDir), 0.);
        c += sunCol * (pow(sd, 900.0/(sunSize+0.001)) * 2.0 * step(0.001, sunSize) + pow(sd, 12.0) * 0.35 * sunSize);
        gl_FragColor = vec4(c, 1.); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  }), [JSON.stringify(o)]);
  mat.uniforms.time.value = (frame / 30) * (o.drift ?? 0.004);
  return <mesh material={mat} scale={o.radius ?? 4200} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[1, 48, 32]} /></mesh>;
};
