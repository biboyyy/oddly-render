// Toon environments (ported from the Blender sets, same layout & units).
import React from 'react';
import * as THREE from 'three';
import { Prim, G } from './prims';
import { PAL, toon } from './toon';
import { rng, V3 } from './math';

export type SetInfo = { kind: string; origin: V3; bg: string; light: { key: V3; target: V3; color: string; intensity: number; ambient: number; sky: string; ground: string } };

const Plant: React.FC<{ pos: V3; s?: number; seed?: number }> = ({ pos, s = 1, seed = 1 }) => {
  const r = rng(seed);
  return (
    <G pos={pos}>
      <Prim kind="cyl" color="#F4F1EA" pos={[0, 0, 0.18 * s]} scale={[0.18 * s, 0.18 * s, 0.36 * s]} args={{ r2: 1.25 }} />
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 7 + (r() - 0.5) * 0.4;
        const tilt = 0.35 + r() * 0.45;
        const h = (0.45 + r() * 0.3) * s;
        return (
          <Prim key={i} kind="cone" color={i % 2 ? '#4BB37A' : '#2F8A5A'} pos={[Math.cos(a) * 0.08 * s, Math.sin(a) * 0.08 * s, 0.36 * s + h / 2]}
            scale={[0.09 * s, 0.035 * s, h]} rot={[Math.cos(a + Math.PI / 2) * tilt, -Math.sin(a + Math.PI / 2) * tilt, a]} args={{ seg: 6 }} outline={0.008} />
        );
      })}
    </G>
  );
};

const Books: React.FC<{ pos: V3; n?: number }> = ({ pos, n = 9 }) => {
  const r = rng(n);
  const cols = [PAL.blue, PAL.yellow, '#FFFFFF', PAL.navy, PAL.lightBlue, '#FF8A80'];
  let x = 0;
  return (
    <G pos={pos}>
      {Array.from({ length: n }, (_, i) => {
        const w = 0.04 + r() * 0.03;
        const h = 0.2 + r() * 0.08;
        const el = <Prim key={i} kind="box" color={cols[i % cols.length]} pos={[x + w / 2, 0, h / 2]} scale={[w / 2, 0.08, h / 2]} rot={i === n - 1 ? [0, 0.25, 0] : undefined} args={{ round: 0.01 }} outline={0.005} />;
        x += w + 0.006;
        return el;
      })}
    </G>
  );
};

// ------------------------------------------------------------------ palettes
// Per-episode colour freedom: a set name may carry a variant ("studio@plum").
export type SetPal = Record<string, string>;
export const PALETTES: Record<string, SetPal> = {
  bedroom: { back: '#CFE5F7', side: '#A9CDEB', plank1: '#E9C99A', plank2: '#DDB27A', rug: PAL.navy, rugRing: PAL.yellow, curtain: PAL.yellow, blanket: PAL.blue, poster: PAL.navy },
  'bedroom@night': { back: '#5B4E86', side: '#4A3F70', plank1: '#8A6A4E', plank2: '#7A5C42', rug: '#2D2447', rugRing: '#FF9F6B', curtain: '#C46B8F', blanket: '#3E3566', poster: '#2D2447' },
  'bedroom@morning': { back: '#FFE6C7', side: '#FFD3A8', plank1: '#E9C99A', plank2: '#DDB27A', rug: '#E86A5B', rugRing: '#FFF3D6', curtain: '#7CC6A4', blanket: '#F28C6B', poster: '#E86A5B' },
  studio: { bg: '#1E3A6E', disc: '#24447D', ring: PAL.lightBlue, ring2: '#2B4F8E', dots: '#2B4F8E', pedTop: PAL.navy, pedRing: PAL.yellow },
  'studio@plum': { bg: '#3A1F4D', disc: '#4E2A66', ring: '#FF7FB0', ring2: '#5E3579', dots: '#6A3C88', pedTop: '#24123A', pedRing: '#FF7FB0' },
  'studio@peach': { bg: '#FFD9C2', disc: '#FFC4A3', ring: '#FF8A65', ring2: '#FFB08F', dots: '#FFB08F', pedTop: '#E86A5B', pedRing: '#FFFFFF' },
  or: { wall: '#BCE0EE', wall2: '#A8D4E6', tile1: '#DCEBF5', tile2: '#C9DDEC', band: PAL.blue, pad: '#3D6FB0' },
  'or@er': { wall: '#BFEBDD', wall2: '#A6DFCB', tile1: '#E4F5EE', tile2: '#CDEBDF', band: '#E5484D', pad: '#2E9E83' },
  'or@clinic': { wall: '#FFE9D6', wall2: '#FFDCC0', tile1: '#FFF6EC', tile2: '#F6E6D4', band: '#F28C6B', pad: '#F28C6B' },
};
export const palOf = (set: string) => PALETTES[set] ?? PALETTES[set.split('@')[0]];

// ------------------------------------------------------------------ bedroom
export const BEDROOM = { W: 6.0, D: 5.0, H: 4.6 };
export const Bedroom: React.FC<{ origin: V3; night?: boolean; pal?: SetPal }> = ({ origin, night, pal = PALETTES.bedroom }) => {
  const { W, D, H } = BEDROOM;
  const wx = 1.35, wz = 1.75, dx = 1.6, dy = D / 2 - 0.1, bx = -2.0, by = 1.4;
  return (
    <G pos={origin}>
      {/* floor planks */}
      {Array.from({ length: 12 }, (_, i) => (
        <Prim key={i} kind="box" color={i % 2 ? pal.plank1 : pal.plank2} pos={[-W / 2 + (i + 0.5) * (W / 12), 0.6, -0.04]} scale={[W / 24 - 0.008, D / 2 + 0.6, 0.04]} args={{ round: 0.01 }} outline={0.004} />
      ))}
      <Prim kind="box" color={pal.back} pos={[0, D / 2 + 0.6, H / 2]} scale={[W / 2 + 0.1, 0.06, H / 2]} args={{ round: 0.02 }} outline={false} />
      <Prim kind="box" color={pal.side} pos={[-W / 2, 0.6, H / 2]} scale={[0.06, D / 2 + 0.6, H / 2]} args={{ round: 0.02 }} outline={false} />
      <Prim kind="box" color="#FFFFFF" pos={[0, D / 2 + 0.53, 0.06]} scale={[W / 2, 0.02, 0.06]} args={{ round: 0.01 }} outline={0.004} />
      {/* window */}
      <Prim kind="box" mat={night ? toon('#1B2A55', { emissive: '#22356B', emissiveIntensity: 0.6 }) : toon('#9ED6FF', { emissive: '#BFE6FF', emissiveIntensity: 0.6 })} pos={[wx, D / 2 + 0.56, wz]} scale={[0.75, 0.01, 0.6]} args={{ round: 0.005 }} outline={false} />
      {night && <Prim kind="sphere" mat={toon('#FFF6D6', { emissive: '#FFF1C2', emissiveIntensity: 1 })} pos={[wx + 0.35, D / 2 + 0.54, wz + 0.28]} scale={[0.11, 0.01, 0.11]} outline={false} />}
      {night && [[0.85, 1.95], [1.2, 1.4], [1.75, 1.6], [1.0, 1.25]].map(([sx, sz], i) => <Prim key={`st${i}`} kind="sphere" mat={toon('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 1 })} pos={[sx, D / 2 + 0.545, sz]} scale={[0.015, 0.005, 0.015]} outline={false} />)}
      {([[wx, D / 2 + 0.52, wz + 0.62, 0.8, 0.05, 0.04], [wx, D / 2 + 0.5, wz - 0.62, 0.85, 0.08, 0.04], [wx - 0.77, D / 2 + 0.52, wz, 0.04, 0.05, 0.62], [wx + 0.77, D / 2 + 0.52, wz, 0.04, 0.05, 0.62], [wx, D / 2 + 0.52, wz, 0.02, 0.04, 0.6]] as number[][]).map((b, i) => (
        <Prim key={i} kind="box" color="#FFFFFF" pos={[b[0], b[1], b[2]]} scale={[b[3], b[4], b[5]]} args={{ round: 0.01 }} outline={0.006} />
      ))}
      {!night && [[0.9, 1.95], [1.6, 1.55], [1.85, 2.05]].map(([cx, cz], i) => (
        <Prim key={i} kind="sphere" color="#FFFFFF" pos={[cx, D / 2 + 0.55, cz]} scale={[0.16, 0.01, 0.07]} outline={false} />
      ))}
      {[-1, 1].map((sx) => (
        <Prim key={sx} kind="box" color={pal.curtain} pos={[wx + sx * 0.95, D / 2 + 0.45, 1.6]} scale={[0.14, 0.04, 0.85]} args={{ round: 0.03 }} />
      ))}
      {/* desk, laptop, mug, lamp, chair */}
      <Prim kind="box" color="#FFFFFF" pos={[dx, dy, 0.76]} scale={[0.75, 0.33, 0.03]} args={{ round: 0.02 }} />
      {[-1, 1].map((sx) => <Prim key={sx} kind="box" color={PAL.navy} pos={[dx + sx * 0.7, dy, 0.38]} scale={[0.03, 0.3, 0.38]} args={{ round: 0.01 }} outline={0.005} />)}
      <Prim kind="box" color="#20283A" pos={[dx - 0.15, dy + 0.02, 0.8]} scale={[0.2, 0.14, 0.01]} args={{ round: 0.005 }} outline={0.005} />
      <G pos={[dx - 0.15, dy + 0.16, 0.93]} rot={[(-12 * Math.PI) / 180, 0, 0]}>
        <Prim kind="box" color="#20283A" scale={[0.2, 0.01, 0.13]} args={{ round: 0.005 }} outline={0.005} />
        <Prim kind="box" mat={toon(PAL.lightBlue, { emissive: PAL.lightBlue, emissiveIntensity: 0.8 })} pos={[0, -0.012, 0]} scale={[0.18, 0.004, 0.11]} args={{ round: 0.002 }} outline={false} />
      </G>
      <Prim kind="cyl" color={PAL.yellow} pos={[dx + 0.35, dy - 0.12, 0.84]} scale={[0.05, 0.05, 0.12]} />
      <Prim kind="cyl" color={PAL.navy} pos={[dx + 0.55, dy + 0.12, 0.8]} scale={[0.08, 0.08, 0.02]} outline={0.005} />
      <Prim kind="cyl" color={PAL.navy} pos={[dx + 0.55, dy + 0.12, 1.0]} scale={[0.012, 0.012, 0.4]} outline={0.004} />
      <Prim kind="cone" color={PAL.yellow} pos={[dx + 0.55, dy + 0.12, 1.22]} scale={[0.13, 0.13, 0.16]} />
      {night && <Prim kind="sphere" mat={toon('#FFF3C9', { emissive: '#FFE9A8', emissiveIntensity: 1.2 })} pos={[dx + 0.55, dy + 0.12, 1.14]} scale={0.045} outline={false} shadow={false} />}
      <Prim kind="box" color={PAL.blue} pos={[dx - 0.1, dy - 0.55, 0.46]} scale={[0.22, 0.22, 0.03]} args={{ round: 0.02 }} />
      <Prim kind="box" color={PAL.blue} pos={[dx - 0.1, dy - 0.75, 0.75]} scale={[0.22, 0.03, 0.25]} args={{ round: 0.02 }} />
      <Prim kind="cyl" color={PAL.navy} pos={[dx - 0.1, dy - 0.55, 0.23]} scale={[0.025, 0.025, 0.45]} outline={0.004} />
      {/* bed */}
      <Prim kind="box" color="#B9854E" pos={[bx, by, 0.2]} scale={[0.9, 1.1, 0.2]} args={{ round: 0.03 }} />
      <Prim kind="box" color="#FFFFFF" pos={[bx, by, 0.48]} scale={[0.86, 1.06, 0.1]} args={{ round: 0.06 }} />
      <Prim kind="box" color={pal.blanket} pos={[bx, by - 0.3, 0.55]} scale={[0.88, 0.75, 0.06]} args={{ round: 0.05 }} />
      <Prim kind="box" color={PAL.yellow} pos={[bx, by - 0.75, 0.615]} scale={[0.885, 0.06, 0.006]} args={{ round: 0.004 }} outline={false} />
      <Prim kind="box" color={PAL.lightBlue} pos={[bx, by + 0.8, 0.62]} scale={[0.55, 0.18, 0.08]} args={{ round: 0.07 }} />
      <Prim kind="box" color="#B9854E" pos={[bx, by + 1.12, 0.65]} scale={[0.9, 0.05, 0.4]} args={{ round: 0.03 }} />
      {/* shelf, books, globe, poster */}
      <Prim kind="box" color="#FFFFFF" pos={[-0.6, D / 2 + 0.45, 1.75]} scale={[0.6, 0.12, 0.02]} args={{ round: 0.01 }} outline={0.005} />
      <Books pos={[-1.1, D / 2 + 0.45, 1.77]} />
      <Prim kind="sphere" color={PAL.lightBlue} pos={[-0.2, D / 2 + 0.45, 1.88]} scale={0.1} />
      <Prim kind="box" color={pal.poster} pos={[-0.6, D / 2 + 0.53, 2.45]} scale={[0.35, 0.01, 0.42]} args={{ round: 0.01 }} outline={0.006} />
      <Prim kind="sphere" color={PAL.yellow} pos={[-0.6, D / 2 + 0.51, 2.5]} scale={[0.17, 0.01, 0.13]} outline={false} />
      <Prim kind="box" color="#FFFFFF" pos={[-0.6, D / 2 + 0.51, 2.2]} scale={[0.2, 0.005, 0.02]} args={{ round: 0.004 }} outline={false} />
      {/* rug */}
      <Prim kind="cyl" color={pal.rug} pos={[-0.1, 0.4, 0.008]} scale={[1.4, 1.0, 0.012]} args={{ seg: 48 }} outline={0.006} />
      <Prim kind="torus" color={pal.rugRing} pos={[-0.1, 0.4, 0.016]} scale={[1.25, 0.88, 0.2]} args={{ tube: 0.03, seg: 64 }} outline={false} />
      <Plant pos={[-2.6, D / 2 + 0.1, 0]} s={1.4} seed={3} />
      <Plant pos={[2.6, D / 2 - 0.15, 0]} s={1.0} seed={7} />
    </G>
  );
};

// ------------------------------------------------------------------ studio
export const Studio: React.FC<{ origin: V3; pal?: SetPal }> = ({ origin, pal = PALETTES.studio }) => {
  const cyc = React.useMemo(() => {
    const prof: Array<[number, number]> = [[-6, 0], [2, 0]];
    for (let a = 1; a <= 12; a++) prof.push([2 + 1.5 * Math.sin((a / 12) * (Math.PI / 2)), 1.5 - 1.5 * Math.cos((a / 12) * (Math.PI / 2))]);
    prof.push([3.5, 9]);
    const pos: number[] = [];
    const idx: number[] = [];
    prof.forEach(([y, z]) => pos.push(-12, y, z, 12, y, z));
    for (let i = 0; i < prof.length - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <G pos={origin}>
      <mesh geometry={cyc} material={toon(pal.bg, { side: THREE.DoubleSide })} receiveShadow />
      {/* halftone-ish floor rings */}
      {[3.2, 4.4, 5.6].map((r, i) => (
        <Prim key={i} kind="torus" color={i === 0 ? pal.ring : pal.ring2} pos={[0, 0, 0.01]} scale={[r, r, 1]} args={{ tube: 0.006, seg: 96 }} outline={false} />
      ))}
      <Prim kind="cyl" color={pal.disc} pos={[0, 0, 0.005]} scale={[2.2, 2.2, 0.01]} args={{ seg: 64 }} outline={0.006} />
      <Prim kind="cyl" color="#FFFFFF" pos={[0, 0, 0.35]} scale={[0.85, 0.85, 0.7]} args={{ seg: 48 }} />
      <Prim kind="cyl" color={pal.pedTop} pos={[0, 0, 0.71]} scale={[0.78, 0.78, 0.02]} args={{ seg: 48 }} outline={0.005} />
      <Prim kind="torus" mat={toon(pal.pedRing, { emissive: pal.pedRing, emissiveIntensity: 0.6 })} pos={[0, 0, 0.6]} scale={[0.86, 0.86, 1]} args={{ tube: 0.014, seg: 96 }} outline={false} />
      {/* floating comic dots in the background (depth, not abstract hero) */}
      {Array.from({ length: 14 }, (_, i) => {
        const r = rng(40 + i);
        return <Prim key={`d${i}`} kind="sphere" color={i % 3 ? pal.dots : pal.pedRing} pos={[-4 + r() * 8, 3.3 + r() * 0.3, 1.2 + r() * 4]} scale={0.04 + r() * 0.05} outline={false} shadow={false} />;
      })}
    </G>
  );
};

// ------------------------------------------------------------------ operating room
export const OperatingRoom: React.FC<{ origin: V3; pal?: SetPal }> = ({ origin, pal = PALETTES.or }) => (
  <G pos={origin}>
    {Array.from({ length: 80 }, (_, k) => {
      const i = k % 10, j = Math.floor(k / 10);
      return <Prim key={k} kind="box" color={(i + j) % 2 ? pal.tile1 : pal.tile2} pos={[-4.5 + i, -3 + j, -0.03]} scale={[0.49, 0.49, 0.03]} args={{ round: 0.01 }} outline={false} />;
    })}
    <Prim kind="box" color={pal.wall} pos={[0, 4.5, 1.7]} scale={[5, 0.06, 1.7]} args={{ round: 0.02 }} outline={false} />
    <Prim kind="box" color={pal.wall2} pos={[-4.9, 0.8, 1.7]} scale={[0.06, 3.8, 1.7]} args={{ round: 0.02 }} outline={false} />
    <Prim kind="box" color={pal.band} pos={[0, 4.42, 1.1]} scale={[5, 0.02, 0.05]} args={{ round: 0.01 }} outline={false} />
    {/* table */}
    <Prim kind="cyl" color="#C9D3E0" pos={[0, 0.3, 0.06]} scale={[0.35, 0.25, 0.12]} />
    <Prim kind="cyl" color="#C9D3E0" pos={[0, 0.3, 0.42]} scale={[0.1, 0.1, 0.7]} />
    <Prim kind="box" color={PAL.navy} pos={[0, 0.3, 0.8]} scale={[1.1, 0.35, 0.05]} args={{ round: 0.03 }} />
    <Prim kind="box" color={pal.pad} pos={[0, 0.3, 0.87]} scale={[1.08, 0.33, 0.035]} args={{ round: 0.03 }} />
    {/* lamp */}
    <Prim kind="cyl" color="#C9D3E0" pos={[0.2, 0.3, 3.3]} scale={[0.05, 0.05, 0.3]} />
    <Prim kind="box" color="#C9D3E0" pos={[-0.2, 0.3, 3.15]} scale={[0.45, 0.04, 0.04]} args={{ round: 0.02 }} />
    <G pos={[-0.6, 0.3, 2.75]} rot={[0, (18 * Math.PI) / 180, 0]}>
      <Prim kind="cyl" color="#FFFFFF" scale={[0.42, 0.42, 0.1]} args={{ seg: 32 }} />
      {Array.from({ length: 7 }, (_, k) => {
        const a = (k * Math.PI) / 3;
        const c = k === 6 ? [0, 0] : [Math.cos(a) * 0.23, Math.sin(a) * 0.23];
        return <Prim key={k} kind="cyl" mat={toon('#FFF3C9', { emissive: '#FFE9A8', emissiveIntensity: 1 })} pos={[c[0], c[1], -0.055]} scale={[0.075, 0.075, 0.02]} outline={false} />;
      })}
    </G>
    {/* monitor */}
    <Prim kind="cyl" color="#C9D3E0" pos={[1.9, 1.8, 0.75]} scale={[0.03, 0.03, 1.5]} />
    <Prim kind="cyl" color="#C9D3E0" pos={[1.9, 1.8, 0.03]} scale={[0.3, 0.3, 0.05]} />
    <G pos={[1.9, 1.8, 1.55]} rot={[0, 0, (-25 * Math.PI) / 180]}>
      <Prim kind="box" color="#20283A" scale={[0.36, 0.06, 0.26]} args={{ round: 0.03 }} />
      <Prim kind="box" mat={toon('#0E1830', { emissive: '#0E1830', emissiveIntensity: 0.4 })} pos={[0, -0.062, 0]} scale={[0.32, 0.004, 0.21]} args={{ round: 0.004 }} outline={false} />
      <Prim kind="box" mat={toon('#5BE59B', { emissive: '#5BE59B', emissiveIntensity: 1 })} pos={[-0.05, -0.068, 0.02]} scale={[0.22, 0.002, 0.008]} args={{ round: 0.002 }} outline={false} />
      <Prim kind="box" mat={toon(PAL.yellow, { emissive: PAL.yellow, emissiveIntensity: 1 })} pos={[0.15, -0.068, -0.12]} scale={[0.1, 0.002, 0.02]} args={{ round: 0.002 }} outline={false} />
    </G>
    <Prim kind="cyl" color="#C9D3E0" pos={[-1.6, 1.3, 1.0]} scale={[0.02, 0.02, 2.0]} outline={0.004} />
    <Prim kind="box" mat={toon('#DFF3FF', { opacity: 0.85 })} pos={[-1.6, 1.3, 1.85]} scale={[0.1, 0.03, 0.16]} args={{ round: 0.04 }} />
    <Prim kind="box" color="#C9D3E0" pos={[1.2, -0.6, 1.0]} scale={[0.3, 0.2, 0.02]} args={{ round: 0.01 }} />
    <Prim kind="cyl" color="#C9D3E0" pos={[1.2, -0.6, 0.5]} scale={[0.02, 0.02, 1.0]} outline={0.004} />
    <Prim kind="box" color="#FFFFFF" pos={[-3.5, 4.0, 0.9]} scale={[0.9, 0.4, 0.9]} args={{ round: 0.03 }} />
    <Plant pos={[3.8, 3.9, 0]} s={1.2} seed={9} />
  </G>
);

export const SET_LIGHT: Record<string, SetInfo['light'] & { bg: string }> = {
  'bedroom@night': { key: [2.0, 3.2, 3.0], target: [0, 0.5, 1.0], color: '#9DB7FF', intensity: 1.2, ambient: 0.75, sky: '#5A6FB0', ground: '#2A2F4A', bg: '#22305A' },
  'bedroom@morning': { key: [-2.5, -3.5, 4.0], target: [0, 0.5, 1.0], color: '#FFE7C2', intensity: 2.7, ambient: 1.3, sky: '#FFF0DC', ground: '#E9C99A', bg: '#FFE6C7' },
  'studio@plum': { key: [-2.5, -3.5, 4.5], target: [0, 0, 1.4], color: '#FFE9F2', intensity: 2.2, ambient: 0.95, sky: '#E7B8FF', ground: '#3A1F4D', bg: '#3A1F4D' },
  'studio@peach': { key: [-2.5, -3.5, 4.5], target: [0, 0, 1.4], color: '#FFFFFF', intensity: 2.3, ambient: 1.25, sky: '#FFF1E6', ground: '#FFC4A3', bg: '#FFD9C2' },
  'or@clinic': { key: [-2.5, -3.5, 3.5], target: [0, 0.3, 1.0], color: '#FFF4E6', intensity: 2.4, ambient: 1.25, sky: '#FFF4EA', ground: '#F6E6D4', bg: '#FFE9D6' },
  iss: { key: [-1.5, -4.0, 3.2], target: [0, 0.3, 1.4], color: '#FFF8F0', intensity: 3.0, ambient: 1.9, sky: '#EAF2FF', ground: '#AEB9C6', bg: '#0B1430' },
  home: { key: [1.5, -3.0, 3.2], target: [0, 0.9, 0.9], color: '#FFD9A8', intensity: 1.6, ambient: 0.85, sky: '#FFE2B8', ground: '#8A6A4E', bg: '#2A2238' },
  futsal: { key: [1.5, -3.5, 5.0], target: [0, 1, 0.5], color: '#FFFFFF', intensity: 2.4, ambient: 1.3, sky: '#E8F0FF', ground: '#2F8F55', bg: '#0F1E33' },
  'or@er': { key: [-2.5, -3.5, 3.5], target: [0, 0.3, 1.0], color: '#F0FFF8', intensity: 2.1, ambient: 1.0, sky: '#D6F5EA', ground: '#A6DFCB', bg: '#A6DFCB' },
  bedroom: { key: [-2.5, -3.5, 4.0], target: [0, 0.5, 1.0], color: '#FFF4E6', intensity: 2.6, ambient: 1.25, sky: '#DCEEFF', ground: '#E9C99A', bg: '#CFE5F7' },
  studio: { key: [-2.5, -3.5, 4.5], target: [0, 0, 1.4], color: '#FFFFFF', intensity: 2.4, ambient: 1.1, sky: '#BFE3FF', ground: '#1E3A6E', bg: '#1E3A6E' },
  or: { key: [-2.5, -3.5, 3.5], target: [0, 0.3, 1.0], color: '#F2FBFF', intensity: 2.5, ambient: 1.25, sky: '#E6F6FF', ground: '#C9DDEC', bg: '#BCE0EE' },
};

// ------------------------------------------------------------------ space station module
// Open-front "stage" module: back wall of racks with an Earth window, floor &
// ceiling racks, handrails, and a spinning ventilation fan (frame-driven).
export const SpaceStation: React.FC<{ origin: V3; frame: number }> = ({ origin, frame }) => {
  const W = 8, BACK = 1.6, H = 3.0, FRONT = -4.5;
  const rackCols = ['#E9EDF2', '#DDE3EA', '#EEF1F5', '#D3DAE3'];
  const r = rng(11);
  const racks: React.ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const x = -3.5 + i;
    if (Math.abs(x) < 0.9) continue; // window bay
    racks.push(
      <G key={`rk${i}`} pos={[x, BACK - 0.03, 1.5]}>
        <Prim kind="box" color={rackCols[i % 4]} scale={[0.47, 0.03, 1.32]} args={{ round: 0.02 }} outline={0.008} />
        {Array.from({ length: 5 }, (_, k) => {
          const c = ['#FF5A5F', '#5BE59B', PAL.yellow, PAL.lightBlue, '#FF9F6B'][Math.floor(r() * 5)];
          return <Prim key={k} kind="box" mat={toon(c, { emissive: c, emissiveIntensity: 0.6 })} pos={[(r() - 0.5) * 0.6, -0.04, (r() - 0.5) * 2.2]} scale={[0.04, 0.01, 0.03]} outline={false} shadow={false} />;
        })}
        <Prim kind="box" color="#B9C3CF" pos={[0, -0.04, 0.5]} scale={[0.36, 0.012, 0.18]} outline={0.005} />
        <Prim kind="box" color="#B9C3CF" pos={[0, -0.04, -0.6]} scale={[0.36, 0.012, 0.22]} outline={0.005} />
      </G>,
    );
  }
  const fanAng = frame * 0.35;
  return (
    <G pos={origin}>
      {/* shell */}
      <Prim kind="box" color="#C7D0DB" pos={[0, BACK + 0.05, H / 2]} scale={[W / 2, 0.05, H / 2]} outline={false} />
      <Prim kind="box" color="#BAC4D0" pos={[0, (BACK + FRONT) / 2, -0.05]} scale={[W / 2, (BACK - FRONT) / 2, 0.05]} outline={false} />
      <Prim kind="box" color="#D5DCE4" pos={[0, (BACK + FRONT) / 2, H + 0.05]} scale={[W / 2, (BACK - FRONT) / 2, 0.05]} outline={false} />
      {[-1, 1].map((sx) => <Prim key={sx} kind="box" color="#AEB9C6" pos={[sx * (W / 2 + 0.05), (BACK + FRONT) / 2, H / 2]} scale={[0.05, (BACK - FRONT) / 2, H / 2]} outline={false} />)}
      {/* floor & ceiling racks with stripes */}
      {Array.from({ length: 8 }, (_, i) => (
        <React.Fragment key={`fl${i}`}>
          <Prim kind="box" color={i % 2 ? '#DDE3EA' : '#CDD5DF'} pos={[-3.5 + i, -0.4, 0.02]} scale={[0.47, 1.9, 0.02]} outline={0.006} />
          <Prim kind="box" color={i % 2 ? '#E9EDF2' : '#DDE3EA'} pos={[-3.5 + i, -0.4, H - 0.02]} scale={[0.47, 1.9, 0.02]} outline={0.006} />
        </React.Fragment>
      ))}
      {/* ceiling light strips */}
      {[-2.5, 0, 2.5].map((x) => <Prim key={`lt${x}`} kind="box" mat={toon('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 1 })} pos={[x, -0.4, H - 0.05]} scale={[0.6, 0.12, 0.01]} outline={false} shadow={false} />)}
      {racks}
      {/* Earth window (cupola-style) */}
      <G pos={[0, BACK - 0.02, 1.55]}>
        <Prim kind="cyl" color="#9AA6B4" rot={[Math.PI / 2, 0, 0]} scale={[0.78, 0.78, 0.08]} args={{ seg: 48 }} outline={0.012} />
        <Prim kind="cyl" mat={toon('#0B1430', { emissive: '#0B1430', emissiveIntensity: 1 })} pos={[0, -0.045, 0]} rot={[Math.PI / 2, 0, 0]} scale={[0.66, 0.66, 0.01]} args={{ seg: 48 }} outline={false} />
        <Prim kind="cyl" mat={toon('#3E8FE0', { emissive: '#2E7BD0', emissiveIntensity: 0.5 })} pos={[0.12, -0.055, -0.2]} rot={[Math.PI / 2, 0, 0]} scale={[0.42, 0.42, 0.01]} args={{ seg: 48 }} outline={false} />
        {[[0.0, -0.3, 0.14, 0.08], [0.28, -0.08, 0.1, 0.07], [0.02, -0.02, 0.07, 0.05]].map(([x, z, sx, sz], i) => (
          <Prim key={`ld${i}`} kind="cyl" mat={toon('#5BC47A', { emissive: '#4CAF6A', emissiveIntensity: 0.4 })} pos={[x, -0.06, z]} rot={[Math.PI / 2, 0, 0]} scale={[sx, sz, 0.01]} args={{ seg: 16 }} outline={false} />
        ))}
        {[[-0.4, 0.35], [-0.2, 0.5], [0.35, 0.45], [-0.5, 0.0], [0.5, 0.2]].map(([x, z], i) => (
          <Prim key={`st${i}`} kind="sphere" mat={toon('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 1 })} pos={[x, -0.06, z]} scale={0.014} outline={false} shadow={false} />
        ))}
      </G>
      {/* handrails */}
      {[-2.4, -1.2, 1.2, 2.4].map((x) => (
        <Prim key={`hr${x}`} kind="cyl" color={PAL.yellow} pos={[x, BACK - 0.18, 0.55]} rot={[0, Math.PI / 2, 0]} scale={[0.025, 0.025, 0.45]} outline={0.006} />
      ))}
      {/* ventilation fan */}
      <G pos={[2.5, BACK - 0.06, 2.45]}>
        <Prim kind="cyl" color="#8C99A8" rot={[Math.PI / 2, 0, 0]} scale={[0.3, 0.3, 0.05]} args={{ seg: 32 }} outline={0.008} />
        <Prim kind="cyl" color="#2B3346" pos={[0, -0.03, 0]} rot={[Math.PI / 2, 0, 0]} scale={[0.26, 0.26, 0.01]} args={{ seg: 32 }} outline={false} />
        <group position={[0, -0.05, 0]} rotation={[0, fanAng, 0]}>
          {[0, 1, 2, 3].map((k) => <Prim key={k} kind="box" color="#C9D3E0" rot={[0, (k * Math.PI) / 2, 0]} pos={[Math.cos((k * Math.PI) / 2) * 0.12, 0, -Math.sin((k * Math.PI) / 2) * 0.12]} scale={[0.11, 0.008, 0.035]} outline={0.004} />)}
          <Prim kind="cyl" color="#E4E9F0" rot={[Math.PI / 2, 0, 0]} scale={[0.04, 0.04, 0.02]} outline={0.004} />
        </group>
      </G>
      {/* laptop strapped to a rack + cable loops */}
      <G pos={[-2.3, BACK - 0.12, 1.75]}>
        <Prim kind="box" color="#2B3346" scale={[0.2, 0.012, 0.13]} rot={[-0.15, 0, 0]} outline={0.006} />
        <Prim kind="box" mat={toon('#7FC8FF', { emissive: '#7FC8FF', emissiveIntensity: 0.7 })} pos={[0, -0.014, 0.0]} scale={[0.17, 0.002, 0.1]} rot={[-0.15, 0, 0]} outline={false} />
      </G>
      <Prim kind="torus" color="#FF9F6B" pos={[-1.5, BACK - 0.1, 2.5]} rot={[Math.PI / 2, 0, 0]} scale={[0.18, 0.12, 0.3]} args={{ tube: 0.06, seg: 24, arc: Math.PI * 1.2 }} outline={0.005} />
    </G>
  );
};

// ------------------------------------------------------------------ Indonesian home: dining room at night
// Table centred at (0, 0.9); chairs at the ends (x = ±1.15) and the back (y = 1.6).
export const HOME_TABLE = { x: 0, y: 0.9, top: 0.75, hx: 0.8, hy: 0.45 };
const Chair: React.FC<{ pos: V3; rotZ: number }> = ({ pos, rotZ }) => (
  <G pos={pos} rot={[0, 0, rotZ]}>
    <Prim kind="box" color="#8A5A3B" pos={[0, 0, 0.42]} scale={[0.22, 0.22, 0.025]} outline={0.006} />
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Prim key={i} kind="box" color="#6E4529" pos={[a * 0.19, b * 0.19, 0.2]} scale={[0.02, 0.02, 0.2]} outline={0.004} />)}
    <Prim kind="box" color="#8A5A3B" pos={[0, 0.2, 0.72]} scale={[0.22, 0.02, 0.28]} outline={0.006} />
  </G>
);
export const Home: React.FC<{ origin: V3; frame: number }> = ({ origin }) => {
  const T = HOME_TABLE;
  const wall = '#F2E3C6', wall2 = '#E8D3AE';
  const plate = (x: number, y: number, k: number) => (
    <G key={`pl${k}`} pos={[x, y, T.top + 0.01]}>
      <Prim kind="cyl" color="#FFFFFF" scale={[0.13, 0.13, 0.012]} args={{ seg: 24 }} outline={0.004} />
      <Prim kind="sphere" color="#FBFBF5" pos={[0.02, 0, 0.03]} scale={[0.07, 0.07, 0.04]} outline={0.003} />
    </G>
  );
  return (
    <G pos={origin}>
      {/* floor tiles */}
      {Array.from({ length: 8 }, (_, i) => Array.from({ length: 6 }, (_, j) => (
        <Prim key={`t${i}_${j}`} kind="box" color={(i + j) % 2 ? '#D9C3A0' : '#CDB48C'} pos={[-3.5 + i, -2.5 + j, -0.01]} scale={[0.5, 0.5, 0.01]} outline={false} />
      )))}
      {/* walls */}
      <Prim kind="box" color={wall} pos={[0, 2.25, 1.6]} scale={[4, 0.05, 1.6]} outline={false} />
      <Prim kind="box" color={wall2} pos={[-3.0, 0, 1.6]} scale={[0.05, 2.5, 1.6]} outline={false} />
      <Prim kind="box" color="#C9A77C" pos={[0, 2.2, 0.45]} scale={[4, 0.03, 0.45]} outline={false} />
      {/* window with night sky + curtains */}
      <G pos={[1.6, 2.2, 1.7]}>
        <Prim kind="box" color="#7A5235" scale={[0.55, 0.04, 0.5]} outline={0.008} />
        <Prim kind="box" mat={toon('#1C2A55', { emissive: '#22356B', emissiveIntensity: 0.7 })} pos={[0, -0.03, 0]} scale={[0.48, 0.01, 0.43]} outline={false} />
        <Prim kind="sphere" mat={toon('#FFF6D6', { emissive: '#FFF1C2', emissiveIntensity: 1 })} pos={[0.25, -0.045, 0.22]} scale={[0.07, 0.01, 0.07]} outline={false} />
        {[-1, 1].map((s) => <Prim key={s} kind="box" color="#B5654A" pos={[s * 0.58, -0.07, 0]} scale={[0.1, 0.03, 0.56]} outline={0.006} />)}
      </G>
      {/* wall clock, calendar, family photo */}
      <G pos={[-0.9, 2.2, 2.3]} rot={[Math.PI / 2, 0, 0]}>
        <Prim kind="cyl" color="#FFFFFF" scale={[0.18, 0.18, 0.03]} args={{ seg: 32 }} outline={0.008} />
        <Prim kind="box" color={PAL.navy} pos={[0, 0.06, -0.04]} scale={[0.008, 0.08, 0.005]} outline={false} />
        <Prim kind="box" color={PAL.navy} pos={[0.04, 0, -0.04]} scale={[0.05, 0.008, 0.005]} outline={false} />
      </G>
      <G pos={[-2.2, 2.2, 1.65]}>
        <Prim kind="box" color="#FFFFFF" scale={[0.22, 0.02, 0.3]} outline={0.006} />
        <Prim kind="box" color="#E5484D" pos={[0, -0.022, 0.2]} scale={[0.22, 0.004, 0.08]} outline={false} />
        {Array.from({ length: 12 }, (_, k) => <Prim key={k} kind="box" color="#9AA6B4" pos={[-0.15 + (k % 4) * 0.1, -0.023, 0.05 - Math.floor(k / 4) * 0.09]} scale={[0.03, 0.002, 0.025]} outline={false} />)}
      </G>
      <G pos={[0.1, 2.2, 1.95]}>
        <Prim kind="box" color="#C9A24D" scale={[0.32, 0.03, 0.24]} outline={0.008} />
        <Prim kind="box" color="#9BC4E2" pos={[0, -0.02, 0]} scale={[0.27, 0.01, 0.19]} outline={false} />
        {[-0.15, -0.03, 0.08, 0.17].map((x, k) => <Prim key={k} kind="sphere" color={['#E9B48C', '#E3AE86', '#C98E66', '#F0C4A0'][k]} pos={[x, -0.03, 0.02 - (k % 2) * 0.05]} scale={0.045} outline={0.003} />)}
      </G>
      {/* cupboard with jars */}
      <G pos={[-2.4, 1.85, 0]}>
        <Prim kind="box" color="#8A5A3B" pos={[0, 0, 0.55]} scale={[0.5, 0.3, 0.55]} outline={0.01} />
        <Prim kind="box" color="#A87550" pos={[0, -0.31, 0.75]} scale={[0.45, 0.01, 0.3]} outline={0.006} />
        {[-0.3, 0, 0.3].map((x, k) => <Prim key={k} kind="cyl" mat={toon(['#F2C94C', '#E07A5F', '#81B29A'][k], { opacity: 0.85 })} pos={[x, 0, 1.18]} scale={[0.09, 0.09, 0.14]} outline={0.005} />)}
      </G>
      {/* table */}
      <Prim kind="box" color="#9C6B45" pos={[T.x, T.y, T.top - 0.025]} scale={[T.hx, T.hy, 0.025]} args={{ round: 0.01 }} outline={0.01} />
      <Prim kind="box" color="#F4F1EA" pos={[T.x, T.y, T.top + 0.002]} scale={[T.hx * 0.75, T.hy * 0.8, 0.003]} outline={false} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Prim key={`lg${i}`} kind="box" color="#7A4E30" pos={[T.x + a * (T.hx - 0.06), T.y + b * (T.hy - 0.06), T.top / 2]} scale={[0.03, 0.03, T.top / 2]} outline={0.005} />)}
      {/* food: rice plates, tempe, sayur asem, water */}
      {plate(0.5, 0.9, 0)}{plate(-0.5, 0.9, 1)}{plate(0, 1.18, 2)}
      <G pos={[0, 0.82, T.top + 0.01]}>
        <Prim kind="cyl" color="#FFFFFF" scale={[0.16, 0.12, 0.012]} args={{ seg: 24 }} outline={0.004} />
        {[[-0.06, 0], [0.02, 0.03], [0.07, -0.02]].map(([x, y], k) => <Prim key={k} kind="box" color="#C98B3E" pos={[x, y, 0.025]} scale={[0.035, 0.025, 0.012]} rot={[0, 0, k * 0.5]} outline={0.003} />)}
      </G>
      <G pos={[-0.18, 0.62, T.top + 0.01]}>
        <Prim kind="cyl" color="#3F7A68" scale={[0.12, 0.12, 0.06]} args={{ seg: 24, r2: 0.75 }} outline={0.005} />
        <Prim kind="cyl" color="#E3A35A" pos={[0, 0, 0.062]} scale={[0.105, 0.105, 0.005]} args={{ seg: 24 }} outline={false} />
        {[[0.03, 0.02, '#5BAA4A'], [-0.04, -0.01, '#C0392B'], [0.0, -0.05, '#F2C94C']].map(([x, y, c], k) => <Prim key={k} kind="sphere" color={c as string} pos={[x as number, y as number, 0.07]} scale={[0.025, 0.02, 0.01]} outline={false} />)}
      </G>
      {[[0.55, 0.62], [-0.55, 1.12], [0.25, 1.25]].map(([x, y], k) => <Prim key={`gl${k}`} kind="cyl" mat={toon('#CFEFFF', { opacity: 0.6 })} pos={[x, y, T.top + 0.07]} scale={[0.035, 0.035, 0.07]} outline={0.003} />)}
      <Chair pos={[1.25, 0.9, 0]} rotZ={-Math.PI / 2} />
      <Chair pos={[-1.25, 0.9, 0]} rotZ={Math.PI / 2} />
      <Chair pos={[0, 1.65, 0]} rotZ={0} />
      {/* hanging lamp */}
      <Prim kind="cyl" color="#3B3F4A" pos={[0, 0.9, 2.65]} scale={[0.008, 0.008, 0.45]} outline={false} />
      <Prim kind="cone" color="#E8C26A" pos={[0, 0.9, 2.2]} scale={[0.26, 0.26, 0.16]} args={{ seg: 24 }} outline={0.008} />
      <Prim kind="sphere" mat={toon('#FFF3C9', { emissive: '#FFE9A8', emissiveIntensity: 1.3 })} pos={[0, 0.9, 2.1]} scale={0.07} outline={false} shadow={false} />
    </G>
  );
};

// ------------------------------------------------------------------ indoor futsal court (night)
export const Futsal: React.FC<{ origin: V3; frame: number }> = ({ origin }) => {
  const line = '#F4F6FA';
  const L = (pos: V3, scale: V3, k: string) => <Prim key={k} kind="box" color={line} pos={pos} scale={scale} outline={false} shadow={false} />;
  return (
    <G pos={origin}>
      <Prim kind="box" color="#2F8F55" pos={[0, 1, -0.02]} scale={[7, 6, 0.02]} outline={false} />
      <Prim kind="box" color="#37A162" pos={[0, 1, -0.005]} scale={[4.5, 3.2, 0.005]} outline={false} />
      {L([0, -2.2, 0.002], [4.5, 0.025, 0.002], 'l1')}{L([0, 4.2, 0.002], [4.5, 0.025, 0.002], 'l2')}
      {L([-4.5, 1, 0.002], [0.025, 3.2, 0.002], 'l3')}{L([4.5, 1, 0.002], [0.025, 3.2, 0.002], 'l4')}
      {L([0, 1, 0.002], [0.025, 3.2, 0.002], 'l5')}
      <Prim kind="torus" color={line} pos={[0, 1, 0.003]} scale={[0.9, 0.9, 1]} args={{ tube: 0.025, seg: 64 }} outline={false} shadow={false} />
      {/* back wall with sponsor boards */}
      <Prim kind="box" color="#1F3B5C" pos={[0, 4.6, 2.0]} scale={[7, 0.05, 2.0]} outline={false} />
      {[-3.6, -1.2, 1.2, 3.6].map((x, i) => (
        <G key={`bd${i}`} pos={[x, 4.52, 0.5]}>
          <Prim kind="box" color={['#E5484D', '#F2C94C', '#2E7BD0', '#5BE59B'][i]} scale={[1.1, 0.03, 0.3]} outline={0.008} />
          <Prim kind="box" color="#FFFFFF" pos={[0, -0.035, 0]} scale={[0.7, 0.005, 0.07]} outline={false} />
        </G>
      ))}
      {/* side wall net */}
      <Prim kind="box" color="#25496E" pos={[-5.2, 1, 2.0]} scale={[0.05, 4, 2.0]} outline={false} />
      {/* goal */}
      <G pos={[-4.5, 1, 0]}>
        {[-1, 1].map((s) => <Prim key={s} kind="cyl" color="#FFFFFF" pos={[0, s * 1.5, 1.0]} scale={[0.05, 0.05, 1.0]} outline={0.008} />)}
        <Prim kind="cyl" color="#FFFFFF" pos={[0, 0, 2.0]} rot={[Math.PI / 2, 0, 0]} scale={[0.05, 0.05, 1.5]} outline={0.008} />
        <Prim kind="box" mat={toon('#DDE3EA', { opacity: 0.35 })} pos={[-0.5, 0, 1.0]} scale={[0.02, 1.5, 1.0]} outline={false} />
      </G>
      {/* ceiling lights */}
      {[-3, 0, 3].map((x) => <Prim key={`cl${x}`} kind="box" mat={toon('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 1 })} pos={[x, 1.5, 4.2]} scale={[0.8, 0.25, 0.03]} outline={false} shadow={false} />)}
      {/* bench + bag + bottle at the touchline */}
      <G pos={[2.7, -2.75, 0]}>
        <Prim kind="box" color="#8A5A3B" pos={[0, 0, 0.42]} scale={[0.9, 0.18, 0.03]} outline={0.008} />
        {[-0.8, 0.8].map((x) => <Prim key={x} kind="box" color="#3B3F4A" pos={[x, 0, 0.2]} scale={[0.04, 0.15, 0.2]} outline={0.005} />)}
        <Prim kind="box" color="#2B3346" pos={[-0.45, 0, 0.58]} scale={[0.25, 0.14, 0.14]} args={{ round: 0.05 }} outline={0.008} />
        <Prim kind="cyl" mat={toon('#7FC8FF', { opacity: 0.8 })} pos={[0.55, 0, 0.55]} scale={[0.04, 0.04, 0.11]} outline={0.005} />
      </G>
    </G>
  );
};
