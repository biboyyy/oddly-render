// EP026 "Kotak Hitam Pesawat" — reusable procedural aviation / disaster-test props for the cinematic engine:
//   jetliner  twin-jet (type 'jetliner'; 'airliner' belongs to Cargo.tsx ep027) airliner (lathe fuselage, swept extruded wings + tailplane, fin, nacelles, window rows,
//             cheatline livery). Nose points +x. keys: pos, rot (deg), scale, xray (0..1 fuselage see-through +
//             glowing recorders in the tail), char (0..1 soot), split (0..1 breaks nose / mid / tail apart),
//             gear (0..1), lit (window glow), recGlow (halo on the recorders).
//   recorder  crash-survivable flight recorder (orange chassis + ribbed memory drum + ULB pinger + white
//             reflective stripes + "FLIGHT RECORDER / DO NOT OPEN" plates). Long axis = x. keys: pos, rot, scale,
//             black (0..1 paints it black/charred), heat (0..1 red-hot emissive), soot (0..1), ping (beacon blink).
//   bubbles   rising bubbles / marine snow (instanced, deterministic).
//   truck     box truck (cab + cargo box + 6 wheels); keys pos/rot; wheels spin with `spin` deg/frame.
//   tower     tall office building with a lit window grid (canvas texture) — city skylines with depth.
//   forge     blacksmith forge: brick hearth + hood/chimney + glowing coal bed + flicker light.
// Everything is a pure function of the frame. Y up, metres, rot in degrees, `at` = scene-local frames.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCurrentFrame } from 'remotion';
import { DEG, Key, noise1, sample } from './tracks';
import { Halo } from './Electric';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const hr = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const mix = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp01(t)).getHexString();
const texCache: Record<string, THREE.Texture> = {};

// ------------------------------------------------------------------ airliner
type AirSpec = { id: string; length?: number; radius?: number; body?: string; accent?: string; tail?: string; belly?: string; keys?: Key[]; lit?: number; recorders?: boolean; engines?: boolean };

/** fuselage radius profile along x (nose +L/2 -> tail -L/2) */
function rAt(x: number, L: number, R: number) {
  const nose = L / 2, nl = R * 2.4, tl = R * 4.6, tail = -L / 2;
  if (x > nose - nl) { const u = (nose - x) / nl; return R * Math.sqrt(clamp01(u * (2 - u))) * (0.18 + 0.82 * Math.sqrt(clamp01(u))) + 0.0001; }
  if (x < tail + tl) { const u = (x - tail) / tl; return R * (0.18 + 0.82 * Math.pow(clamp01(u), 0.65)); }
  return R;
}
function latheSeg(x0: number, x1: number, L: number, R: number, n = 24) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; pts.push(new THREE.Vector2(Math.max(0.001, rAt(x, L, R)), x)); }
  const g = new THREE.LatheGeometry(pts, 48);
  g.rotateZ(-Math.PI / 2); // lathe axis Y -> x (y -> x maps: point (r, y) -> axis x = y)
  return g;
}
function planform(pts: number[][], thick: number) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => s.lineTo(p[0], p[1])); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.35, bevelSize: thick * 0.35, bevelSegments: 2 });
  g.translate(0, 0, -thick / 2);
  return g;
}

export const Airliner: React.FC<{ o: AirSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const L = o.length ?? 38, R = o.radius ?? 1.95;
  const geo = useMemo(() => {
    const xs = [-L / 2, -L / 2 + L * 0.3, L / 2 - L * 0.24, L / 2];
    const wing = planform([[3.2, 0], [-3.6, 0], [-8.6, 16.5], [-6.6, 16.5]], 0.32); wing.rotateX(Math.PI / 2); // (x, span->z), thickness y
    const htail = planform([[-L / 2 + 5.4, 0], [-L / 2 + 1.6, 0], [-L / 2 - 0.4, 6.2], [-L / 2 + 1.4, 6.2]], 0.18); htail.rotateX(Math.PI / 2);
    const fin = planform([[-L / 2 + 7.2, 0], [-L / 2 + 1.2, 0], [-L / 2 - 1.2, 7.2], [-L / 2 + 1.6, 7.2]], 0.26);
    const winds: number[][] = [];
    for (let x = -L / 2 + R * 4.4; x < L / 2 - R * 2.6; x += 0.56) if (Math.abs(x - 0.4) > 0.5) winds.push([x]);
    return { nose: latheSeg(xs[2], xs[3], L, R), mid: latheSeg(xs[1], xs[2], L, R), aft: latheSeg(xs[0], xs[1], L, R), wing, htail, fin, winds, xs };
  }, [L, R]);
  const pos = sample<number[]>(o.keys, 'pos', f, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', f, [0, 0, 0]);
  const sc = sample<number>(o.keys, 'scale', f, 1);
  const xray = sample<number>(o.keys, 'xray', f, 0);
  const ch = sample<number>(o.keys, 'char', f, 0);
  const split = sample<number>(o.keys, 'split', f, 0);
  const gear = sample<number>(o.keys, 'gear', f, 0);
  const lit = sample<number>(o.keys, 'lit', f, o.lit ?? 0);
  const recGlow = sample<number>(o.keys, 'recGlow', f, 0);
  const recBlack = sample<number>(o.keys, 'recBlack', f, 0);
  const body = mix(o.body ?? '#f2f4f7', '#1b1a1a', ch), belly = mix(o.belly ?? '#c9ced6', '#141313', ch);
  const acc = mix(o.accent ?? '#ff7a1a', '#2a1a14', ch * 0.9), tailc = mix(o.tail ?? '#1f3b73', '#1a1514', ch * 0.9);
  const bodyMat = <meshStandardMaterial color={body} roughness={0.38 + ch * 0.5} metalness={0.15} transparent={xray > 0.01} opacity={1 - xray * 0.78} depthWrite={xray < 0.3} />;
  // sections: aft (tail) stays, mid drops a little, nose flies forward + pitches down
  const sNose: [number, number, number] = [split * 6, -split * 2.2, split * 1.2], rNose = -split * 18;
  const sMid: [number, number, number] = [split * 1.5, -split * 1.0, -split * 0.6], rMid = split * 6;
  const aftX = geo.xs[0] + 6.2;
  const W = (side: 1 | -1) => (
    <group scale={[1, 1, side]}>
      <mesh geometry={geo.wing} position={[1.0, -R * 0.55, R * 0.6]} rotation={[-4 * DEG, 0, 0]} castShadow receiveShadow><meshStandardMaterial color={mix('#e2e6ec', '#1b1a1a', ch)} roughness={0.45} metalness={0.2} side={THREE.DoubleSide} /></mesh>
      {o.engines !== false && <group position={[-0.6, -R * 0.55 - 1.15, 6.2]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.92, 0.78, 4.2, 32]} /><meshStandardMaterial color={mix('#d9dee6', '#1a1919', ch)} roughness={0.35} metalness={0.4} /></mesh>
        <mesh position={[2.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.78, 0.78, 0.06, 32]} /><meshStandardMaterial color={'#1c1f26'} roughness={0.6} metalness={0.6} /></mesh>
        <mesh position={[2.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.22, 0.4, 16]} /><meshStandardMaterial color={'#c8ccd4'} metalness={0.7} roughness={0.3} /></mesh>
        <mesh position={[-0.2, 0.85, 0]} castShadow><boxGeometry args={[3.0, 0.7, 0.26]} /><meshStandardMaterial color={mix('#cfd4dc', '#1a1919', ch)} roughness={0.5} /></mesh>
      </group>}
    </group>
  );
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={sc}>
      {/* aft section: tail fin, tailplane, the two recorders */}
      <group position={[-split * 2.5, split * 0.2, split * 0.4]} rotation={[0, split * 8 * DEG, 0]}>
        <mesh geometry={geo.aft} castShadow receiveShadow>{bodyMat}</mesh>
        <mesh geometry={geo.fin} position={[0, R * 0.55, 0]} castShadow><meshStandardMaterial color={tailc} roughness={0.4} metalness={0.15} /></mesh>
        <mesh geometry={geo.htail} position={[0, R * 0.12, R * 0.2]} castShadow><meshStandardMaterial color={mix('#e2e6ec', '#1b1a1a', ch)} roughness={0.45} side={THREE.DoubleSide} /></mesh>
        <group scale={[1, 1, -1]}><mesh geometry={geo.htail} position={[0, R * 0.12, R * 0.2]} castShadow><meshStandardMaterial color={mix('#e2e6ec', '#1b1a1a', ch)} roughness={0.45} side={THREE.DoubleSide} /></mesh></group>
        {o.recorders !== false && <group position={[aftX, R * 0.05, 0]}>
          <RecorderMesh size={1.5} black={recBlack} heat={0} soot={0} ping={0} pos={[0, 0, 0.42]} rot={[0, 0, 0]} />
          <RecorderMesh size={1.5} black={recBlack} heat={0} soot={0} ping={0} pos={[0.95, 0, -0.42]} rot={[0, 0, 0]} />
          {recGlow > 0.01 && <Halo pos={[0.45, 0.05, 0]} size={3.2 * recGlow} color={recBlack > 0.5 ? '#d8e8ff' : '#ff8a2a'} opacity={0.85 * recGlow} />}
        </group>}
      </group>
      {/* mid: wings, engines, cheatline, windows */}
      <group position={sMid} rotation={[0, 0, rMid * DEG]}>
        <mesh geometry={geo.mid} castShadow receiveShadow>{bodyMat}</mesh>
        {W(1)}{W(-1)}
        <mesh position={[0, -R * 0.78, 0]} scale={[1, 0.25, 1]}><boxGeometry args={[geo.xs[2] - geo.xs[1], R * 0.9, R * 1.5]} /><meshStandardMaterial color={belly} roughness={0.5} transparent={xray > 0.01} opacity={1 - xray * 0.85} /></mesh>
        {gear > 0.02 && [[2.0, 1.6], [2.0, -1.6]].map(([gx, gz], k) => <group key={k} position={[gx - 2.5, -R - 0.9 * gear, gz]}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.55, 0.55, 0.45, 20]} /><meshStandardMaterial color={'#15161a'} roughness={0.9} /></mesh><mesh position={[0, 0.7, 0]}><boxGeometry args={[0.16, 1.4, 0.16]} /><meshStandardMaterial color={'#9aa0aa'} metalness={0.6} /></mesh></group>)}
      </group>
      {/* windows + cheatline on all sections (shift with their section) */}
      {[1, -1].map((side) => (
        <group key={side}>
          {geo.winds.map(([x], k) => {
            const sec = x > geo.xs[2] ? sNose : x > geo.xs[1] ? sMid : [-split * 2.5, split * 0.2, split * 0.4];
            return <mesh key={k} position={[x + sec[0], R * 0.32 + sec[1], side * (Math.sqrt(R * R - (R * 0.32) ** 2) * (rAt(x, L, R) / R) + 0.01) + sec[2]]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.26, 0.38, 0.04]} /><meshStandardMaterial color={lit > 0.01 ? '#ffe2b0' : '#1b2433'} emissive={lit > 0.01 ? '#ffc070' : '#000000'} emissiveIntensity={lit} roughness={0.2} toneMapped={lit <= 0.01} />
            </mesh>;
          })}
          <mesh position={[(geo.xs[1] + geo.xs[2]) / 2 + sMid[0], R * 0.02 + sMid[1], side * (R + 0.012) + sMid[2]]}><boxGeometry args={[geo.xs[2] - geo.xs[1], 0.22, 0.02]} /><meshStandardMaterial color={acc} roughness={0.4} /></mesh>
        </group>
      ))}
      {/* nose: cockpit glass */}
      <group position={sNose} rotation={[0, 0, rNose * DEG]}>
        <mesh geometry={geo.nose} castShadow receiveShadow>{bodyMat}</mesh>
        {[1, -1].map((s) => <mesh key={s} position={[L / 2 - R * 1.25, R * 0.42, s * R * 0.42]} rotation={[0, s * 35 * DEG, -22 * DEG]}><boxGeometry args={[0.9, 0.34, 0.6]} /><meshStandardMaterial color={'#121a26'} roughness={0.1} metalness={0.5} /></mesh>)}
        <mesh position={[L / 2 - R * 1.25, -R * 0.1, 0]}><boxGeometry args={[R * 2.6, 0.2, 0.02]} /><meshStandardMaterial color={acc} roughness={0.4} transparent opacity={0} /></mesh>
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ flight recorder
const plateTex = (key: string, lines: string[], bg: string, fg: string) => {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(14, 14, 484, 228);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.font = `900 ${i === 0 ? 62 : 44}px Montserrat, Arial, sans-serif`; g.fillText(l, 256, 128 + (i - (lines.length - 1) / 2) * 76); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texCache[key] = t; return t;
};
type RecProps = { size: number; black: number; heat: number; soot: number; ping: number; pos: number[]; rot: number[]; label?: string };
export const RecorderMesh: React.FC<RecProps> = ({ size, black, heat, soot, ping, pos, rot, label }) => {
  const orange = mix(mix('#ff6a00', '#5a2a10', soot * 0.7), '#121212', black);
  const stripe = mix(mix('#f4f4f0', '#6a6460', soot * 0.8), '#1a1a1a', black);
  const hot = heat > 0.01 ? { emissive: mix('#ff2a00', '#ffb040', heat * heat), emissiveIntensity: 0.4 + heat * 2.2 } : { emissive: '#000000', emissiveIntensity: 0 };
  const plate = plateTex('rec_' + (label ?? ''), label ? label.split('\n') : ['FLIGHT RECORDER', 'DO NOT OPEN'], '#ff6a00', '#111111');
  const mat = (c: string, r = 0.55, m = 0.1) => <meshStandardMaterial color={c} roughness={r} metalness={m} {...hot} toneMapped={heat < 0.05} />;
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={size}>
      {/* mounting tray */}
      <mesh position={[0, -0.085, 0]} castShadow receiveShadow><boxGeometry args={[0.6, 0.02, 0.24]} />{mat(mix('#2a2c30', '#111', black), 0.6, 0.5)}</mesh>
      {/* electronics chassis */}
      <mesh position={[-0.1, 0.0, 0]} castShadow receiveShadow><boxGeometry args={[0.32, 0.16, 0.2]} />{mat(orange, 0.5)}</mesh>
      {/* crash-survivable memory drum with ribs */}
      <mesh position={[0.15, 0.0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow><cylinderGeometry args={[0.085, 0.085, 0.2, 32]} />{mat(orange, 0.45)}</mesh>
      {[0.07, 0.11, 0.15, 0.19, 0.23].map((x, k) => <mesh key={k} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.092, 0.092, 0.012, 32]} />{mat(orange, 0.45)}</mesh>)}
      {/* reflective stripes around the chassis */}
      {[-0.19, -0.02].map((x, k) => <mesh key={k} position={[x, 0, 0]}><boxGeometry args={[0.035, 0.165, 0.205]} />{mat(stripe, 0.3)}</mesh>)}
      {/* underwater locator beacon */}
      <mesh position={[0.31, 0.0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.028, 0.028, 0.12, 20]} />{mat(mix('#3a3d44', '#111', black), 0.35, 0.6)}</mesh>
      <mesh position={[0.375, 0, 0]}><sphereGeometry args={[0.02, 12, 10]} /><meshStandardMaterial color={'#7fe0ff'} emissive={'#5fd0ff'} emissiveIntensity={ping * 4} toneMapped={ping < 0.05} /></mesh>
      {/* label plates both sides */}
      {black < 0.6 && [1, -1].map((s) => <mesh key={s} position={[-0.105, 0.005, s * 0.1015]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}><planeGeometry args={[0.13, 0.065]} /><meshStandardMaterial map={plate} roughness={0.6} transparent opacity={1 - black * 1.6} {...hot} /></mesh>)}
      {black < 0.6 && <mesh position={[-0.1, 0.0805, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.2, 0.1]} /><meshStandardMaterial map={plate} roughness={0.6} transparent opacity={1 - black * 1.6} {...hot} /></mesh>}
      {/* handle */}
      <mesh position={[-0.27, 0.0, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.04, 0.008, 8, 20, Math.PI]} />{mat(mix('#2a2c30', '#111', black), 0.4, 0.6)}</mesh>
    </group>
  );
};
type RecorderSpec = { id: string; size?: number; keys?: Key[]; label?: string; pingEvery?: number; glow?: number };
export const Recorder: React.FC<{ o: RecorderSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const pos = sample<number[]>(o.keys, 'pos', f, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', f, [0, 0, 0]);
  const sc = sample<number>(o.keys, 'scale', f, 1);
  const black = sample<number>(o.keys, 'black', f, 0);
  const heat = sample<number>(o.keys, 'heat', f, 0);
  const soot = sample<number>(o.keys, 'soot', f, 0);
  const pingOn = sample<number>(o.keys, 'ping', f, 0);
  const halo = sample<number>(o.keys, 'halo', f, o.glow ?? 0);
  const every = o.pingEvery ?? 30;
  const ph = (f % every) / every; const ping = pingOn * Math.max(0, 1 - ph * 5);
  const S = (o.size ?? 1) * sc;
  if (S <= 0.001) return null;
  return (
    <group>
      <RecorderMesh size={S} black={black} heat={heat} soot={soot} ping={ping} pos={pos} rot={rot} label={o.label} />
      {halo > 0.01 && <Halo pos={pos} size={S * 1.3 * halo} color={heat > 0.2 ? '#ff6a20' : '#ff8a30'} opacity={0.55 * Math.min(1, halo)} />}
      {heat > 0.05 && <pointLight position={[pos[0], pos[1] + 0.2 * S, pos[2] + 0.2 * S]} color={'#ff6a20'} intensity={heat * 6 * S} distance={3 * S} decay={1.5} />}
    </group>
  );
};

// ------------------------------------------------------------------ bubbles / marine snow
type BubSpec = { id: string; center?: number[]; box?: number[]; count?: number; speed?: number; size?: number; color?: string; opacity?: number; sink?: boolean };
export const Bubbles: React.FC<{ o: BubSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const n = o.count ?? 120; const [bx, by, bz] = o.box ?? [8, 8, 8]; const c = o.center ?? [0, 0, 0];
  const ref = React.useRef<THREE.InstancedMesh>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const t = f / 30, v = (o.speed ?? 0.6) * (o.sink ? -0.25 : 1);
  const mesh = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 10, 8);
    const mat = new THREE.MeshStandardMaterial({ color: o.color ?? '#cfeeff', roughness: 0.1, metalness: 0.0, transparent: true, opacity: o.opacity ?? 0.55, emissive: o.color ?? '#bfe8ff', emissiveIntensity: 0.35, depthWrite: false });
    return new THREE.InstancedMesh(geo, mat, n);
  }, [n, o.color, o.opacity]);
  for (let k = 0; k < n; k++) {
    let y = (hr(k) * by + t * v * (0.5 + hr(k + 9))) % by; if (y < 0) y += by;
    const s = (o.size ?? 0.03) * (0.4 + hr(k + 3) * 1.2);
    m.makeScale(s, s, s);
    m.setPosition(c[0] + (hr(k + 1) - 0.5) * bx + Math.sin(t * 2.2 + k) * 0.05, c[1] + y - by / 2, c[2] + (hr(k + 2) - 0.5) * bz + Math.cos(t * 1.7 + k) * 0.05);
    mesh.setMatrixAt(k, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  void ref;
  return <primitive object={mesh} frustumCulled={false} />;
};

// ------------------------------------------------------------------ box truck
type TruckSpec = { id: string; keys?: Key[]; color?: string; cargo?: string; spin?: number; scale?: number };
export const Truck: React.FC<{ o: TruckSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const pos = sample<number[]>(o.keys, 'pos', f, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', f, [0, 0, 0]);
  const spin = sample<number>(o.keys, 'spin', f, o.spin ?? 0);
  const wa = f * spin * DEG;
  const cab = o.color ?? '#c8302a', cargo = o.cargo ?? '#e8e4da';
  const wheel = (x: number, z: number, k: number) => <group key={k} position={[x, 0.52, z]}><mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.52, 0.52, 0.38, 24]} /><meshStandardMaterial color={'#16171a'} roughness={0.95} /></mesh>
    <mesh rotation={[Math.PI / 2, wa, 0]} position={[0, 0, Math.sign(z) * 0.2]}><cylinderGeometry args={[0.26, 0.26, 0.02, 6]} /><meshStandardMaterial color={'#a8aab0'} metalness={0.7} roughness={0.3} /></mesh></group>;
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={o.scale ?? 1}>
      <mesh position={[-1.0, 2.0, 0]} castShadow receiveShadow><boxGeometry args={[5.4, 2.7, 2.4]} /><meshStandardMaterial color={cargo} roughness={0.7} /></mesh>
      <mesh position={[-1.0, 0.72, 0]} castShadow><boxGeometry args={[6.6, 0.3, 2.2]} /><meshStandardMaterial color={'#2a2b30'} roughness={0.8} metalness={0.3} /></mesh>
      <mesh position={[2.75, 1.55, 0]} castShadow receiveShadow><boxGeometry args={[1.9, 2.0, 2.3]} /><meshStandardMaterial color={cab} roughness={0.45} metalness={0.2} /></mesh>
      <mesh position={[3.66, 1.95, 0]}><boxGeometry args={[0.06, 0.9, 2.0]} /><meshStandardMaterial color={'#1b2433'} roughness={0.08} metalness={0.6} /></mesh>
      {[1, -1].map((s) => <mesh key={s} position={[3.0, 1.95, s * 1.16]}><boxGeometry args={[1.0, 0.7, 0.02]} /><meshStandardMaterial color={'#1b2433'} roughness={0.08} metalness={0.6} /></mesh>)}
      {[1, -1].map((s) => <mesh key={'h' + s} position={[3.71, 1.0, s * 0.85]}><boxGeometry args={[0.04, 0.22, 0.34]} /><meshStandardMaterial color={'#fff4d8'} emissive={'#ffe8b0'} emissiveIntensity={1.4} toneMapped={false} /></mesh>)}
      <mesh position={[3.7, 0.62, 0]}><boxGeometry args={[0.1, 0.3, 2.3]} /><meshStandardMaterial color={'#3a3b40'} metalness={0.5} roughness={0.4} /></mesh>
      {[[2.6, 1.05], [2.6, -1.05], [-1.6, 1.05], [-1.6, -1.05], [-2.8, 1.05], [-2.8, -1.05]].map(([x, z], k) => wheel(x, z, k))}
    </group>
  );
};

// ------------------------------------------------------------------ tall building with lit window grid
type TowerSpec = { id: string; size: number[]; pos: number[]; rot?: number; color?: string; lit?: number; seed?: number; glass?: string; floors?: number; cols?: number; light?: number };
const towerTex = (key: string, floors: number, cols: number, lit: number, seed: number, glass: string, emissive: boolean) => {
  const k = `${key}_${emissive}`; if (texCache[k]) return texCache[k];
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d')!;
  g.fillStyle = emissive ? '#000' : '#00000000'; g.fillRect(0, 0, 256, 512);
  if (!emissive) g.clearRect(0, 0, 256, 512);
  const cw = 256 / cols, fh = 512 / floors;
  for (let r = 0; r < floors; r++) for (let q = 0; q < cols; q++) {
    const on = hr(seed * 13 + r * 31 + q * 7) < lit;
    g.fillStyle = emissive ? (on ? (hr(r * 3 + q + seed) < 0.3 ? '#ffe6b8' : '#ffc77a') : '#000') : (on ? '#ffd9a0' : glass);
    g.fillRect(q * cw + cw * 0.14, r * fh + fh * 0.22, cw * 0.72, fh * 0.56);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texCache[k] = t; return t;
};
export const Tower: React.FC<{ o: TowerSpec }> = ({ o }) => {
  const [w, h, d] = o.size;
  const floors = o.floors ?? Math.max(4, Math.round(h / 3.4)), cols = o.cols ?? Math.max(3, Math.round(w / 2.2));
  const lit = o.lit ?? 0.45, seed = o.seed ?? 1;
  const map = useMemo(() => towerTex(o.id, floors, cols, lit, seed, o.glass ?? '#3a4658', false), [o.id]);
  const em = useMemo(() => towerTex(o.id, floors, cols, lit, seed, o.glass ?? '#3a4658', true), [o.id]);
  return (
    <group position={o.pos as any} rotation={[0, (o.rot ?? 0) * DEG, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={o.color ?? '#8c94a4'} roughness={0.8} /></mesh>
      {[[0, d / 2 + 0.02, 0, w], [Math.PI, -d / 2 - 0.02, 0, w], [Math.PI / 2, 0, w / 2 + 0.02, d], [-Math.PI / 2, 0, -w / 2 - 0.02, d]].map(([ry, z, x, fw], k) => (
        <mesh key={k} position={[x, h / 2, z]} rotation={[0, ry, 0]}><planeGeometry args={[fw * 0.98, h * 0.98]} /><meshStandardMaterial map={map} transparent emissiveMap={em} emissive={'#ffffff'} emissiveIntensity={o.light ?? 1.1} roughness={0.25} metalness={0.3} /></mesh>
      ))}
      <mesh position={[0, h + 0.4, 0]} castShadow><boxGeometry args={[w * 0.5, 0.8, d * 0.5]} /><meshStandardMaterial color={'#5a606c'} roughness={0.8} /></mesh>
    </group>
  );
};

// ------------------------------------------------------------------ blacksmith forge
type ForgeSpec = { id: string; pos: number[]; rot?: number; size?: number; keys?: Key[] };
const brickTex = () => {
  if (texCache.brick) return texCache.brick;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!;
  g.fillStyle = '#4a3a34'; g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) for (let q = -1; q < 5; q++) {
    const x = q * 64 + (r % 2) * 32, y = r * 32; const v = hr(r * 9 + q) * 30;
    g.fillStyle = `rgb(${120 + v},${62 + v * 0.5},${48 + v * 0.3})`; g.fillRect(x + 2, y + 2, 60, 28);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; texCache.brick = t; return t;
};
export const Forge: React.FC<{ o: ForgeSpec }> = ({ o }) => {
  const f = useCurrentFrame();
  const S = o.size ?? 1;
  const heat = sample<number>(o.keys, 'heat', f, 1);
  const fl = 0.85 + 0.15 * noise1(f / 4, 3);
  const tex = useMemo(() => { const t = brickTex().clone(); t.repeat.set(2, 1.4); t.needsUpdate = true; return t; }, []);
  const coals = useMemo(() => Array.from({ length: 46 }, (_, k) => [(hr(k) - 0.5) * 1.25, hr(k + 5) * 0.12, (hr(k + 11) - 0.5) * 0.7, 0.07 + hr(k + 2) * 0.06]), []);
  return (
    <group position={o.pos as any} rotation={[0, (o.rot ?? 0) * DEG, 0]} scale={S}>
      {/* hearth body */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow><boxGeometry args={[1.9, 0.9, 1.2]} /><meshStandardMaterial map={tex} roughness={0.95} /></mesh>
      {/* back wall + hood + chimney */}
      <mesh position={[0, 1.35, -0.52]} castShadow receiveShadow><boxGeometry args={[1.9, 0.9, 0.18]} /><meshStandardMaterial map={tex} roughness={0.95} /></mesh>
      <mesh position={[0, 2.05, -0.2]} rotation={[-12 * DEG, 0, 0]} castShadow><boxGeometry args={[1.9, 0.55, 0.9]} /><meshStandardMaterial color={'#2a2624'} roughness={0.7} metalness={0.4} /></mesh>
      <mesh position={[0, 3.2, -0.3]} castShadow><boxGeometry args={[0.6, 1.9, 0.6]} /><meshStandardMaterial map={tex} roughness={0.95} /></mesh>
      {/* coal bed */}
      <mesh position={[0, 0.91, 0.02]}><boxGeometry args={[1.45, 0.04, 0.85]} /><meshStandardMaterial color={'#2a0a02'} emissive={'#ff4a10'} emissiveIntensity={1.2 * heat * fl} toneMapped={false} /></mesh>
      {coals.map(([x, y, z, r], k) => <mesh key={k} position={[x, 0.93 + y, z]}><sphereGeometry args={[r, 8, 6]} /><meshStandardMaterial color={'#1a0a06'} emissive={hr(k + f * 0.01) > 0.4 ? '#ff5a12' : '#ff9a30'} emissiveIntensity={(0.4 + 1.6 * hr(k + 7)) * heat * (0.75 + 0.25 * noise1(f / 5 + k, 2))} toneMapped={false} roughness={0.9} /></mesh>)}
      <pointLight position={[0, 1.4, 0.4]} color={'#ff7a2a'} intensity={9 * heat * fl} distance={7} decay={1.6} castShadow={false} />
      <Halo pos={[0, 1.05, 0.05]} size={2.4 * heat} color={'#ff6a20'} opacity={0.55 * heat * fl} />
    </group>
  );
};

export const AVIATION_TYPES = ['jetliner', 'recorder', 'bubbles', 'truck', 'tower', 'forge'];
export const AviationObject: React.FC<{ o: any }> = ({ o }) => {
  switch (o.type) {
    case 'jetliner': return <Airliner o={o} />;
    case 'recorder': return <Recorder o={o} />;
    case 'bubbles': return <Bubbles o={o} />;
    case 'truck': return <Truck o={o} />;
    case 'tower': return <Tower o={o} />;
    case 'forge': return <Forge o={o} />;
    default: return null;
  }
};
