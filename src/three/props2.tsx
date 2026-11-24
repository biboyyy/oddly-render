// Extra toon props + bathroom set for the "fun fact" format (EP004+).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Prim, G } from './prims';
import { PAL, outlineMat, toon } from './toon';
import { noise3, rng, V3 } from './math';
import { Tube } from './anatomy';

// ------------------------------------------------------------------ giant hand
// Hand stands upright, palm facing the camera (-Y), fingers point +Z.
export const FINGERS: Array<{ x: number; len: number; r: number; tilt: number }> = [
  { x: -0.33, len: 0.62, r: 0.095, tilt: 0.12 },
  { x: -0.11, len: 0.8, r: 0.105, tilt: 0.04 },
  { x: 0.11, len: 0.86, r: 0.107, tilt: -0.02 },
  { x: 0.33, len: 0.74, r: 0.1, tilt: -0.1 },
];
const PALM_TOP = 0.42;

const fingerCache = new Map<string, THREE.BufferGeometry>();
/** capsule finger along +Z with pruney wrinkles on the pad side (-Y). */
export function fingerGeo(len: number, r: number, w: number, seed: number) {
  const q = Math.round(w * 20) / 20;
  const key = `${len}|${r}|${q}|${seed}`;
  const hit = fingerCache.get(key);
  if (hit) return hit;
  const g = new THREE.CapsuleGeometry(r, len, 10, 28, 40);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); // capsule axis = Y in three, centred
    const along = (v.y + len / 2 + r) / (len + 2 * r); // 0 base .. 1 tip
    const radial = Math.hypot(v.x, v.z);
    if (radial > 1e-4 && along > 0.18) {
      const ang = Math.atan2(v.x, -v.z); // 0 = pad side (towards -Z here, becomes -Y)
      const pad = Math.max(0, Math.cos(ang)) ** 0.7 + 0.35;
      const tipBoost = 0.6 + 0.8 * along;
      const n1 = noise3(v.x * 18 + seed, v.y * 9, v.z * 18);
      const ridges = Math.sin(v.y * 62 + n1 * 3.2 + Math.sin(ang * 3 + seed) * 1.5);
      const blobs = noise3(v.x * 30 + seed * 3, v.y * 30, v.z * 30);
      const d = q * r * (0.2 * ridges + 0.08 * blobs) * pad * tipBoost;
      const s = (radial + d) / radial;
      v.x *= s;
      v.z *= s;
      // pruney finger-tip slightly deflates
      v.y -= q * 0.02 * Math.max(0, along - 0.7) * len;
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  g.rotateX(Math.PI / 2); // axis -> +Z (blender up), pad side -> -Y
  g.translate(0, 0, len / 2 + r * 0.4);
  fingerCache.set(key, g);
  return g;
}

export type HandState = { wrinkle: number; xray: number; constrict: number; nerve: number; cut: boolean; wet: number; signals: Array<{ t: number }> };

export const HAND_ANCHORS: Record<string, V3> = {
  tip: [-0.11, -0.12, PALM_TOP + 0.84],
  tip2: [0.11, -0.12, PALM_TOP + 0.9],
  pad: [0.11, -0.13, PALM_TOP + 0.62],
  palm: [0, -0.16, 0.1],
  vessel: [0.11, -0.05, PALM_TOP + 0.45],
  nerve: [-0.11, -0.06, PALM_TOP + 0.3],
  cut: [0, -0.1, -0.25],
  wrist: [0, -0.08, -0.45],
};

export const nerveCurve = (fx: number, flen: number) =>
  new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.02, -0.75), new THREE.Vector3(fx * 0.4, -0.04, 0.0), new THREE.Vector3(fx, -0.05, PALM_TOP + 0.1), new THREE.Vector3(fx, -0.05, PALM_TOP + flen * 0.9)]);

export const GiantHand: React.FC<{ s: HandState; skin?: string; id: string }> = ({ s, skin = '#F7CBA6', id }) => {
  const mat = useMemo(() => {
    const m = toon(skin, { unique: `${id}_skin` });
    return m;
  }, [id, skin]);
  mat.transparent = s.xray > 0.001;
  mat.opacity = 1 - 0.7 * s.xray;
  mat.depthWrite = s.xray < 0.5;
  mat.emissive.set(s.wet > 0 ? '#7FC8FF' : '#000000');
  mat.emissiveIntensity = 0.12 * s.wet;
  const ol = s.xray > 0.5 ? outlineMat(0.008, PAL.blue) : outlineMat(0.014);
  const palm = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 40, 28);
    return g;
  }, []);
  const vessels = useMemo(() => FINGERS.map((f) => new THREE.CatmullRomCurve3([new THREE.Vector3(f.x * 0.5, -0.02, -0.6), new THREE.Vector3(f.x * 0.9, -0.03, 0.1), new THREE.Vector3(f.x, -0.03, PALM_TOP + 0.05), new THREE.Vector3(f.x + f.tilt * 0.2, -0.03, PALM_TOP + f.len * 0.95)])), []);
  const nerves = useMemo(() => FINGERS.map((f) => nerveCurve(f.x, f.len)), []);
  return (
    <group>
      {/* palm + wrist + sleeve cuff */}
      <mesh geometry={palm} material={mat} scale={[0.48, 0.17, 0.5]} position={[0, 0, 0.05]} castShadow />
      <mesh geometry={palm} material={ol} scale={[0.48, 0.17, 0.5]} position={[0, 0, 0.05]} />
      <Prim kind="cyl" mat={mat} pos={[0, 0.01, -0.5]} scale={[0.27, 0.15, 0.55]} outline={0.014} />
      <Prim kind="cyl" color={PAL.blue} pos={[0, 0.01, -0.82]} scale={[0.33, 0.21, 0.32]} outline={0.014} />
      <Prim kind="torus" color={PAL.yellow} pos={[0, 0.01, -0.66]} scale={[0.33, 0.21, 0.6]} args={{ tube: 0.12, seg: 32 }} outline={0.008} />
      {FINGERS.map((f, i) => {
        const g = fingerGeo(f.len, f.r, s.wrinkle, i * 7 + 1);
        return (
          <group key={i} position={[f.x, 0, PALM_TOP - 0.12]} rotation={new THREE.Euler(0, f.tilt, 0, 'ZYX')}>
            <mesh geometry={g} material={mat} castShadow />
            <mesh geometry={g} material={ol} />
            {/* nail */}
            <Prim kind="sphere" color="#FBE3D3" pos={[0, 0.07, f.len + 0.02]} scale={[f.r * 0.6, 0.02, f.r * 0.75]} outline={0.006} />
          </group>
        );
      })}
      {/* thumb */}
      <group position={[-0.43, -0.02, 0.0]} rotation={new THREE.Euler(0, 0.75, 0.25, 'ZYX')}>
        <mesh geometry={fingerGeo(0.45, 0.11, s.wrinkle * 0.8, 99)} material={mat} castShadow />
        <mesh geometry={fingerGeo(0.45, 0.11, s.wrinkle * 0.8, 99)} material={ol} />
      </group>
      {/* inner anatomy (visible in x-ray) */}
      {s.xray > 0.05 && (
        <group>
          {vessels.map((c, i) => (
            <group key={`v${i}`} position={[0, 0, 0]}>
              <Tube curve={c} radius={0.026 * (1 - 0.6 * s.constrict)} color="#E5484D" emissive={0.3} outline={false} segs={48} />
            </group>
          ))}
          {s.nerve > 0.01 && nerves.map((c, i) => <Tube key={`n${i}`} curve={c} radius={0.016} color={PAL.yellow} emissive={0.7} grow={s.nerve} outline={false} segs={48} />)}
        </group>
      )}
      {s.cut && (
        <group position={[0, -0.2, -0.25]}>
          <Prim kind="box" color="#FF5A5F" scale={[0.2, 0.02, 0.035]} rot={[0, 0.7, 0]} outline={0.008} shadow={false} />
          <Prim kind="box" color="#FF5A5F" scale={[0.2, 0.02, 0.035]} rot={[0, -0.7, 0]} outline={0.008} shadow={false} />
        </group>
      )}
      {/* water droplets when wet */}
      {s.wet > 0.05 &&
        [[-0.2, 0.3], [0.25, 0.1], [0.05, 0.75], [-0.35, 0.65], [0.36, 0.95]].map(([x, z], i) => (
          <Prim key={`w${i}`} kind="sphere" mat={toon('#BFE6FF', { emissive: '#BFE6FF', emissiveIntensity: 0.3 })} pos={[x, -0.16, z]} scale={[0.022 * s.wet, 0.015 * s.wet, 0.03 * s.wet]} outline={0.004} shadow={false} />
        ))}
    </group>
  );
};

// ------------------------------------------------------------------ tire
export const Tire: React.FC<{ spin: number }> = ({ spin }) => (
  <group rotation={new THREE.Euler(spin, 0, 0, 'ZYX')}>
    <group rotation={new THREE.Euler(0, Math.PI / 2, 0, 'ZYX')}>
      <Prim kind="torus" color="#2A2F3A" scale={[0.62, 0.62, 0.9]} args={{ tube: 0.42, seg: 48 }} outline={0.014} />
      <Prim kind="cyl" color="#C9D3E0" scale={[0.42, 0.42, 0.3]} args={{ seg: 32 }} outline={0.012} />
      <Prim kind="cyl" color={PAL.yellow} scale={[0.15, 0.15, 0.34]} args={{ seg: 16 }} outline={0.01} />
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return <Prim key={`s${i}`} kind="box" color="#9FAAB8" pos={[Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0]} rot={[0, 0, a]} scale={[0.12, 0.035, 0.12]} outline={0.008} />;
      })}
      {Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2;
        return <Prim key={`t${i}`} kind="box" color="#1C2029" pos={[Math.cos(a) * 0.86, Math.sin(a) * 0.86, (i % 2 ? 1 : -1) * 0.09]} rot={[0, 0, a + (i % 2 ? 0.35 : -0.35)]} scale={[0.05, 0.045, 0.13]} args={{ round: 0.02 }} outline={0.006} />;
      })}
    </group>
  </group>
);

// ------------------------------------------------------------------ soap + duck
export const Soap: React.FC<{ spin: number }> = ({ spin }) => (
  <group rotation={new THREE.Euler(spin * 0.7, spin, spin * 0.3, 'ZYX')}>
    <Prim kind="box" color="#FF9AC2" scale={[0.1, 0.06, 0.04]} args={{ round: 0.035 }} outline={0.008} />
    <Prim kind="box" color="#FFC3DB" pos={[0, 0, 0.035]} scale={[0.06, 0.03, 0.01]} args={{ round: 0.008 }} outline={false} />
    {[[-0.08, 0.04], [0.09, -0.03], [0.02, 0.07]].map(([x, z], i) => (
      <Prim key={i} kind="sphere" mat={toon('#FFFFFF', { opacity: 0.85 })} pos={[x, -0.02, z]} scale={0.02 + i * 0.006} outline={0.004} shadow={false} />
    ))}
  </group>
);

export const Duck: React.FC<{ pos: V3; bob: number; s?: number }> = ({ pos, bob, s = 1 }) => (
  <G pos={[pos[0], pos[1], pos[2] + Math.sin(bob) * 0.015]} rot={[Math.sin(bob * 0.7) * 0.1, 0, -0.5]} scale={s}>
    <Prim kind="sphere" color={PAL.yellow} pos={[0, 0, 0.06]} scale={[0.1, 0.13, 0.07]} outline={0.008} />
    <Prim kind="sphere" color={PAL.yellow} pos={[0, -0.08, 0.15]} scale={0.06} outline={0.008} />
    <Prim kind="cone" color="#FF8A3D" pos={[0, -0.15, 0.145]} scale={[0.03, 0.03, 0.05]} rot={[Math.PI / 2, 0, 0]} outline={0.005} />
    {[-1, 1].map((sx) => <Prim key={sx} kind="sphere" color="#141824" pos={[sx * 0.028, -0.125, 0.17]} scale={0.009} outline={false} />)}
  </G>
);

// ------------------------------------------------------------------ bathroom
export const BATH = { tub: [-1.0, 0.9, 0] as V3, mirror: [1.55, 2.3, 1.55] as V3 };

export const Bathroom: React.FC<{ origin: V3; frame: number }> = ({ origin, frame }) => {
  const W = 5.2, D = 4.6, H = 4.4;
  const tiles = useMemo(() => {
    const out: Array<[number, number, string]> = [];
    for (let i = 0; i < 13; i++) for (let j = 0; j < 11; j++) out.push([-W / 2 + 0.2 + i * 0.4, 0.2 + j * 0.4, (i + j) % 2 ? '#CDEBFF' : '#B7DFFB']);
    return out;
  }, []);
  const [tx, ty] = BATH.tub;
  const r = rng(5);
  const foam = Array.from({ length: 26 }, (_, i) => [tx - 0.75 + r() * 1.5, ty - 0.38 + r() * 0.76, 0.62 + r() * 0.05, 0.06 + r() * 0.07, i] as number[]);
  return (
    <G pos={origin}>
      {Array.from({ length: 9 }, (_, i) =>
        Array.from({ length: 8 }, (_, j) => (
          <Prim key={`f${i}${j}`} kind="box" color={(i + j) % 2 ? '#F4F7FB' : '#DCE6F2'} pos={[-W / 2 + 0.3 + i * 0.6, -1.5 + j * 0.6, -0.03]} scale={[0.29, 0.29, 0.03]} args={{ round: 0.01 }} outline={false} />
        )),
      )}
      {tiles.map(([x, z, c], k) => (
        <Prim key={`t${k}`} kind="box" color={c} pos={[x, D / 2 - 0.4, z]} scale={[0.19, 0.03, 0.19]} args={{ round: 0.01 }} outline={false} />
      ))}
      <Prim kind="box" color="#9FD3F7" pos={[-W / 2, 0.4, H / 2]} scale={[0.05, D / 2, H / 2]} args={{ round: 0.01 }} outline={false} />
      <Prim kind="box" color={PAL.blue} pos={[0, D / 2 - 0.44, 1.2]} scale={[W / 2, 0.02, 0.05]} args={{ round: 0.01 }} outline={false} />
      {/* bathtub */}
      <Prim kind="box" color="#FFFFFF" pos={[tx, ty, 0.3]} scale={[0.9, 0.5, 0.3]} args={{ round: 0.12 }} outline={0.014} />
      <Prim kind="box" mat={toon('#8FD3FF', { emissive: '#8FD3FF', emissiveIntensity: 0.15 })} pos={[tx, ty, 0.58]} scale={[0.8, 0.4, 0.01]} args={{ round: 0.005 }} outline={false} />
      {foam.map(([x, y, z, s, i]) => (
        <Prim key={`fo${i}`} kind="sphere" color="#FFFFFF" pos={[x, y, z + Math.sin(frame / 12 + i) * 0.01]} scale={s} outline={0.006} shadow={false} />
      ))}
      <Prim kind="cyl" color="#C9D3E0" pos={[tx - 0.75, ty + 0.4, 0.95]} scale={[0.03, 0.03, 0.7]} outline={0.006} />
      <Prim kind="sphere" color="#C9D3E0" pos={[tx - 0.75, ty + 0.25, 1.3]} scale={[0.1, 0.1, 0.05]} rot={[0.6, 0, 0]} outline={0.008} />
      <Duck pos={[tx + 0.45, ty - 0.2, 0.58]} bob={frame / 9} />
      {/* sink + mirror */}
      <Prim kind="box" color="#FFFFFF" pos={[1.55, D / 2 - 0.65, 0.85]} scale={[0.4, 0.25, 0.08]} args={{ round: 0.06 }} outline={0.01} />
      <Prim kind="cyl" color="#FFFFFF" pos={[1.55, D / 2 - 0.65, 0.42]} scale={[0.09, 0.09, 0.85]} outline={0.01} />
      <Prim kind="cyl" color="#C9D3E0" pos={[1.55, D / 2 - 0.5, 1.0]} scale={[0.02, 0.02, 0.18]} outline={0.005} />
      <Prim kind="box" color={PAL.yellow} pos={[1.55, D / 2 - 0.43, 1.6]} scale={[0.42, 0.02, 0.5]} args={{ round: 0.05 }} outline={0.012} />
      <Prim kind="box" mat={toon('#DDF2FF', { emissive: '#DDF2FF', emissiveIntensity: 0.35 })} pos={[1.55, D / 2 - 0.445, 1.6]} scale={[0.36, 0.01, 0.44]} args={{ round: 0.04 }} outline={false} />
      <Prim kind="box" mat={toon('#FFFFFF', { opacity: 0.7 })} pos={[1.45, D / 2 - 0.46, 1.75]} scale={[0.04, 0.005, 0.2]} rot={[0, 0.6, 0]} args={{ round: 0.01 }} outline={false} />
      {/* towel rail + towel */}
      <Prim kind="cyl" color="#C9D3E0" pos={[0.35, D / 2 - 0.43, 1.6]} scale={[0.02, 0.02, 0.7]} rot={[0, Math.PI / 2, 0]} outline={0.005} />
      <Prim kind="box" color={PAL.yellow} pos={[0.35, D / 2 - 0.48, 1.3]} scale={[0.3, 0.03, 0.3]} args={{ round: 0.03 }} outline={0.008} />
      <Prim kind="box" color="#FFFFFF" pos={[0.35, D / 2 - 0.51, 1.15]} scale={[0.3, 0.005, 0.03]} args={{ round: 0.005 }} outline={false} />
      {/* bath mat */}
      <Prim kind="box" color={PAL.blue} pos={[0.2, -0.1, 0.01]} scale={[0.6, 0.35, 0.012]} args={{ round: 0.01 }} outline={0.006} />
      {/* shelf with bottles */}
      <Prim kind="box" color="#FFFFFF" pos={[tx, D / 2 - 0.5, 1.45]} scale={[0.45, 0.1, 0.02]} args={{ round: 0.01 }} outline={0.006} />
      {[[-0.3, '#FF8A80', 0.14], [-0.12, PAL.lightBlue, 0.18], [0.08, '#5BE59B', 0.12], [0.26, PAL.yellow, 0.16]].map(([x, c, h], i) => (
        <Prim key={`b${i}`} kind="box" color={c as string} pos={[tx + (x as number), D / 2 - 0.5, 1.47 + (h as number) / 2]} scale={[0.05, 0.05, (h as number) / 2]} args={{ round: 0.03 }} outline={0.006} />
      ))}
    </G>
  );
};

export const BATHROOM_LIGHT = { key: [-2.0, -3.5, 4.0] as V3, target: [0, 0.8, 1.0] as V3, color: '#FFFFFF', intensity: 2.4, ambient: 1.3, sky: '#E6F6FF', ground: '#DCE6F2', bg: '#B7DFFB' };

// ------------------------------------------------------------------ futsal ball
export const Ball: React.FC<{ spin: number }> = ({ spin }) => (
  <group rotation={[spin, spin * 0.6, 0]}>
    <Prim kind="sphere" color="#FFFFFF" scale={0.11} outline={0.008} />
    {[[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].map(([x, y, z], i) => (
      <Prim key={i} kind="sphere" color="#1B1E2B" pos={[x * 0.095, y * 0.095, z * 0.095]} scale={[x ? 0.02 : 0.04, y ? 0.02 : 0.04, z ? 0.02 : 0.04]} outline={false} shadow={false} />
    ))}
  </group>
);

// ------------------------------------------------------------------ piano
export const Piano: React.FC = () => {
  const wood = '#4A3328';
  return (
    <group>
      <Prim kind="box" color={wood} pos={[0, 0.12, 0.62]} scale={[0.62, 0.14, 0.62]} args={{ round: 0.02 }} outline={0.012} />
      <Prim kind="box" color="#5C4033" pos={[0, 0.12, 1.26]} scale={[0.64, 0.16, 0.03]} outline={0.01} />
      <Prim kind="box" color={wood} pos={[0, -0.12, 0.66]} scale={[0.6, 0.12, 0.03]} outline={0.01} />
      <Prim kind="box" color="#F7F3EA" pos={[0, -0.13, 0.7]} scale={[0.56, 0.08, 0.012]} outline={0.006} />
      {Array.from({ length: 21 }, (_, i) => (i % 7 === 2 || i % 7 === 6 ? null : (
        <Prim key={i} kind="box" color="#1B1E2B" pos={[-0.53 + i * 0.0545 + 0.027, -0.105, 0.716]} scale={[0.016, 0.045, 0.01]} outline={false} />
      )))}
      {[-1, 1].map((sx) => <Prim key={sx} kind="box" color={wood} pos={[sx * 0.55, -0.16, 0.3]} scale={[0.04, 0.04, 0.3]} outline={0.008} />)}
      <Prim kind="box" color="#F7F3EA" pos={[0.05, 0.0, 0.98]} scale={[0.18, 0.012, 0.13]} rot={[-0.25, 0, 0]} outline={0.006} />
    </group>
  );
};

// ------------------------------------------------------------------ phone
export const Phone: React.FC<{ glow?: number }> = ({ glow = 1 }) => (
  <group rotation={[0.35, 0, 0]}>
    <Prim kind="box" color="#1B1E2B" scale={[0.04, 0.006, 0.075]} args={{ round: 0.006 }} outline={0.004} />
    <Prim kind="box" mat={toon('#BFE6FF', { emissive: '#9FD6FF', emissiveIntensity: 0.9 * glow })} pos={[0, -0.0065, 0.002]} scale={[0.034, 0.001, 0.064]} outline={false} shadow={false} />
  </group>
);

// ------------------------------------------------------------------ pills & heart
export const PillBottle: React.FC<{ spin: number }> = ({ spin }) => (
  <group rotation={new THREE.Euler(spin * 0.3, spin, 0, 'ZYX')}>
    <Prim kind="cyl" mat={toon('#F39A3D', { opacity: 0.9 })} scale={[0.05, 0.05, 0.12]} args={{ seg: 20 }} outline={0.006} />
    <Prim kind="cyl" color="#FFFFFF" pos={[0, 0, 0.075]} scale={[0.054, 0.054, 0.035]} args={{ seg: 20 }} outline={0.006} />
    <Prim kind="cyl" color="#FFFFFF" pos={[0, 0, -0.005]} scale={[0.052, 0.052, 0.055]} args={{ seg: 20 }} outline={false} />
    <Prim kind="box" color={PAL.blue} pos={[0, -0.052, -0.005]} scale={[0.02, 0.002, 0.012]} outline={false} />
  </group>
);

export const Capsule: React.FC<{ rot?: number }> = ({ rot = 0 }) => (
  <group rotation={new THREE.Euler(0, rot, rot * 0.7, 'ZYX')} scale={0.6}>
    <Prim kind="sphere" color="#FFFFFF" pos={[0, 0, 0.012]} scale={[0.014, 0.014, 0.024]} outline={0.003} />
    <Prim kind="sphere" color={PAL.lightBlue} pos={[0, 0, -0.012]} scale={[0.014, 0.014, 0.024]} outline={0.003} />
  </group>
);

/** cartoon heart, beats with `pulse` 0..1 */
export const Heart: React.FC<{ pulse: number; glow: number; color?: string }> = ({ pulse, glow, color = '#FF5A5F' }) => {
  const s = 1 + 0.16 * pulse;
  const m = toon(color, { emissive: color, emissiveIntensity: 0.15 + 0.6 * glow });
  return (
    <group scale={[s, s * 0.85 + 0.15, s]}>
      {[-1, 1].map((sx) => <Prim key={sx} kind="sphere" mat={m} pos={[sx * 0.12, 0, 0.08]} scale={[0.16, 0.13, 0.16]} outline={0.012} />)}
      <Prim kind="cone" mat={m} pos={[0, 0, -0.1]} scale={[0.255, 0.13, 0.3]} rot={[Math.PI, 0, 0]} args={{ seg: 24 }} outline={0.012} />
      <Prim kind="sphere" color="#FFFFFF" pos={[-0.13, -0.11, 0.15]} scale={[0.035, 0.02, 0.05]} rot={[0, -0.4, 0]} outline={false} shadow={false} />
    </group>
  );
};
