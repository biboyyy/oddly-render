// Stylised anatomy for the toon engine: procedural brain (lobes), layered
// head cutaway with real cross-section caps, vessels and nerve fibres.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { noise3, rng, V3 } from './math';
import { outlineMat, toon, PAL } from './toon';

export const REGIONS = ['frontal', 'parietal', 'temporal', 'occipital'] as const;
export type Region = (typeof REGIONS)[number] | 'cerebellum' | 'stem';
const BRAIN_PINK = '#F49AB0';

const regionOf = (x: number, y: number, z: number): (typeof REGIONS)[number] => {
  if (y > 0.36) return 'occipital';
  if (z < -0.06 && y < 0.28 && Math.abs(x) > 0.12) return 'temporal';
  if (y < -0.12 && z > -0.25) return 'frontal';
  return 'parietal';
};

export type BrainGeo = Record<Region, THREE.BufferGeometry>;

const stripAttrs = (g: THREE.BufferGeometry) => {
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  return g;
};

const geoCache = new Map<number, BrainGeo>();

function hemisphere(side: 1 | -1, detail: number, seed: number) {
  const g = mergeVertices(stripAttrs(new THREE.IcosahedronGeometry(1, detail)));
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let px = x * 0.27, py = y * 0.64, pz = z * 0.44;
    if (x * side < 0) px *= 0.88;
    if (z < -0.2) pz = -0.2 * 0.44 + (pz + 0.2 * 0.44) * 0.55;
    if (z < 0 && y < 0.3) px *= 1 + 0.18 * -z;
    px += side * 0.25;
    const n = new THREE.Vector3(x, y, z).normalize();
    const qx = px * 6 + seed * 3.1, qy = py * 6, qz = pz * 6;
    const g1 = Math.exp(-((noise3(qx, qy, qz) / 0.13) ** 2));
    const g2 = Math.exp(-((noise3(qx * 1.7 + 5, qy * 1.7 + 1, qz * 1.7 + 2) / 0.11) ** 2));
    let groove = Math.min(1, g1 + 0.7 * g2);
    let d = 0.035 - 0.065 * groove;
    if (x * side < -0.6) {
      d *= 0.3;
      groove *= 0.3;
    }
    pos.setXYZ(i, px + n.x * d, py + n.y * d, pz + n.z * d);
    const k = 1 - 0.35 * groove;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** split an indexed geometry into region sub-geometries by face centre */
function splitRegions(g: THREE.BufferGeometry, side: 1 | -1, out: Record<string, number[][]>) {
  const idx = g.getIndex()!;
  const pos = g.getAttribute('position');
  for (let f = 0; f < idx.count; f += 3) {
    const a = idx.getX(f), b = idx.getX(f + 1), c = idx.getX(f + 2);
    const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3 - side * 0.25;
    const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
    const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    out[regionOf(cx, cy, cz)].push([a, b, c]);
  }
}

function subGeometry(src: THREE.BufferGeometry, tris: number[][]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', src.getAttribute('position'));
  g.setAttribute('normal', src.getAttribute('normal'));
  g.setAttribute('color', src.getAttribute('color'));
  g.setIndex(tris.flat());
  return g;
}

export function buildBrain(detail = 4): BrainGeo {
  const hit = geoCache.get(detail);
  if (hit) return hit;
  const res: Partial<BrainGeo> = {};
  const parts: Record<string, THREE.BufferGeometry[]> = { frontal: [], parietal: [], temporal: [], occipital: [] };
  ([1, -1] as const).forEach((side, i) => {
    const h = hemisphere(side, detail * 4, i);
    const tris: Record<string, number[][]> = { frontal: [], parietal: [], temporal: [], occipital: [] };
    splitRegions(h, side, tris);
    for (const r of REGIONS) parts[r].push(subGeometry(h, tris[r]));
  });
  for (const r of REGIONS) {
    res[r] = mergeTwo(parts[r][0], parts[r][1]);
  }
  // cerebellum with horizontal folia
  const cb = mergeVertices(stripAttrs(new THREE.IcosahedronGeometry(1, 10)));
  const p = cb.getAttribute('position') as THREE.BufferAttribute;
  const cc = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = new THREE.Vector3(x, y, z).normalize();
    const ridge = 0.5 + 0.5 * Math.sin(z * 38);
    p.setXYZ(i, x * 0.4 + n.x * 0.012 * ridge, y * 0.24 + n.y * 0.012 * ridge + 0.42, z * 0.19 + n.z * 0.012 * ridge - 0.27);
    cc[i * 3] = cc[i * 3 + 1] = cc[i * 3 + 2] = 0.75 + 0.25 * ridge;
  }
  cb.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  cb.computeVertexNormals();
  res.cerebellum = cb;
  const st = new THREE.CylinderGeometry(0.064, 0.085, 0.42, 14);
  st.rotateX(Math.PI / 2);
  st.rotateX((-14 * Math.PI) / 180);
  st.translate(0, 0.24, -0.47);
  const sc = new Float32Array(st.getAttribute('position').count * 3).fill(1);
  st.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  res.stem = st;
  geoCache.set(detail, res as BrainGeo);
  return res as BrainGeo;
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
  const out = new THREE.BufferGeometry();
  const attrs = ['position', 'normal', 'color'];
  for (const name of attrs) {
    const A = a.getAttribute(name).array as Float32Array;
    const B = b.getAttribute(name).array as Float32Array;
    const arr = new Float32Array(A.length + B.length);
    arr.set(A, 0);
    arr.set(B, A.length);
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  const offset = a.getAttribute('position').count;
  const ia = Array.from(a.getIndex()!.array);
  const ib = Array.from(b.getIndex()!.array).map((i) => i + offset);
  out.setIndex([...ia, ...ib]);
  return out;
}

const brainMats = new Map<string, THREE.MeshToonMaterial>();
const brainMat = (key: string, color = BRAIN_PINK) => {
  let m = brainMats.get(key);
  if (!m) {
    m = toon(color, { unique: key });
    m.vertexColors = true;
    m.transparent = false;
    brainMats.set(key, m);
  }
  return m;
};

/** Brain at unit scale (≈1.1 wide). glow/regionGlow drive emissive. */
export const Brain: React.FC<{ geo: BrainGeo; glow?: number; color?: string; regionGlow?: Partial<Record<Region, number>>; regionColor?: string; outline?: boolean; id?: string }> = ({ geo, glow = 0, color = '#7FC8FF', regionGlow = {}, regionColor = '#7FC8FF', outline = true, id = 'brain' }) => {
  const ol = outlineMat(0.012);
  return (
    <group>
      {(Object.keys(geo) as Region[]).map((r) => {
        const m = brainMat(`${id}_${r}`, r === 'cerebellum' ? '#E88FA6' : r === 'stem' ? '#EFA3B4' : BRAIN_PINK);
        const rg = regionGlow[r] ?? 0;
        const useRegion = rg > glow;
        m.emissive.set(useRegion ? regionColor : color);
        m.emissiveIntensity = Math.max(glow, rg) * 0.55;
        return (
          <group key={r}>
            <mesh geometry={geo[r]} material={m} castShadow receiveShadow />
            {outline && <mesh geometry={geo[r]} material={ol} />}
          </group>
        );
      })}
    </group>
  );
};

// ------------------------------------------------------------------ surfaces
export const ellipsoidPoint = (d: THREE.Vector3, r: V3) => {
  const v = d.clone().normalize();
  const t = 1 / Math.sqrt((v.x / r[0]) ** 2 + (v.y / r[1]) ** 2 + (v.z / r[2]) ** 2);
  return v.multiplyScalar(t);
};

export function surfaceWalk(start: THREE.Vector3, heading: THREE.Vector3, radii: V3, steps: number, step: number, rand: () => number, lift = 1) {
  let d = start.clone().normalize();
  let h = heading.clone();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < steps; i++) {
    pts.push(ellipsoidPoint(d, radii).multiplyScalar(lift));
    h = h.sub(d.clone().multiplyScalar(h.dot(d))).normalize();
    const side = d.clone().cross(h).normalize();
    h = h.add(side.multiplyScalar((rand() * 2 - 1) * 0.5)).normalize();
    d = d.add(h.clone().multiplyScalar(step)).normalize();
  }
  return pts;
}

export function vesselCurves(radii: V3, seed = 11) {
  const r = rng(seed);
  const trunks: Array<[V3, V3]> = [
    [[1, -0.1, -0.35], [0, 0.2, 1]], [[-1, -0.1, -0.35], [0, 0.2, 1]], [[0.9, 0.5, -0.2], [0, -0.3, 1]], [[-0.9, 0.5, -0.2], [0, -0.3, 1]],
    [[0.3, -1, -0.1], [0.2, 0, 1]], [[-0.3, -1, -0.1], [-0.2, 0, 1]], [[0.8, -0.6, 0.05], [-0.2, 0.1, 1]], [[0.5, -0.9, 0.1], [0.3, 0.3, 1]],
  ];
  const curves: Array<{ curve: THREE.CatmullRomCurve3; w: number }> = [];
  for (const [s, h] of trunks) {
    const pts = surfaceWalk(new THREE.Vector3(...s), new THREE.Vector3(...h), radii, 8, 0.2, r);
    curves.push({ curve: new THREE.CatmullRomCurve3(pts), w: 1 });
    for (const j of [2, 4, 5]) {
      const b = surfaceWalk(pts[j], new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 1.2 - 0.2), radii, 4, 0.18, r);
      curves.push({ curve: new THREE.CatmullRomCurve3([pts[j], ...b.slice(1)]), w: 0.6 });
    }
  }
  return curves;
}

export function nerveCurves(radii: V3, n = 4, a0 = 25, a1 = 85, target: V3 = [0.32, -0.42, -0.3], seed = 5) {
  const r = rng(seed);
  const gdir = new THREE.Vector3(0.55, -0.83, 0.04).normalize();
  const Gp = ellipsoidPoint(gdir, radii).multiplyScalar(0.985);
  const curves: THREE.CatmullRomCurve3[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((a0 + i * ((a1 - a0) / Math.max(1, n - 1))) * Math.PI) / 180;
    const d = new THREE.Vector3(Math.sin(a), -Math.cos(a) * 0.8, 0.55 + 0.45 * (i % 2) + (r() * 0.16 - 0.08)).normalize();
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const q = d.clone().lerp(gdir, t).normalize().add(new THREE.Vector3(0, 0, 0.05 * Math.sin(t * Math.PI) * (i % 2 ? 1 : -1)));
      pts.push(ellipsoidPoint(q, radii).multiplyScalar(0.985));
    }
    curves.push(new THREE.CatmullRomCurve3(pts));
  }
  const T = new THREE.Vector3(...target);
  curves.push(new THREE.CatmullRomCurve3([Gp, Gp.clone().add(T).multiplyScalar(0.5).add(new THREE.Vector3(0.05, -0.05, 0)), T]));
  return curves;
}

/** Tube that can grow along its length (0..1). */
export const Tube: React.FC<{ curve: THREE.Curve<THREE.Vector3>; radius: number; color: string; grow?: number; emissive?: number; outline?: boolean; segs?: number }> = ({ curve, radius, color, grow = 1, emissive = 0, outline = true, segs = 64 }) => {
  const g = useMemo(() => new THREE.TubeGeometry(curve, segs, radius, 8, false), [curve, radius, segs]);
  const m = toon(color, { emissive: color, emissiveIntensity: emissive });
  const count = g.getIndex()!.count;
  const n = Math.floor((count / 48) * Math.max(0, Math.min(1, grow))) * 48;
  g.setDrawRange(0, n);
  if (n <= 0) return null;
  return (
    <group>
      <mesh geometry={g} material={m} castShadow />
      {outline && <mesh geometry={g} material={outlineMat(0.006)} />}
    </group>
  );
};

// ------------------------------------------------------------------ cutaway
export const CUT_RADII: Record<'scalp' | 'skull' | 'dura', V3> = { scalp: [0.8, 0.98, 0.86], skull: [0.74, 0.91, 0.8], dura: [0.68, 0.85, 0.74] };
const THICK = { scalp: 0.05, skull: 0.055, dura: 0.02 };
const LAYER_COLORS = { scalp: '#F7CBA6', skull: '#F3EBDA', dura: '#7FC8FF' };
const CAP_COLORS = { scalp: '#E8A889', skull: '#E4D6B8', dura: '#4FA3E0' };

/** quarter elliptical annulus on one of the three cut planes */
function capGeometry(plane: 'x' | 'y' | 'z', outer: V3, inner: V3) {
  const N = 24;
  const pos: number[] = [];
  const idx: number[] = [];
  // axes (u, v) on the plane, both positive inside the removed octant
  const map = (u: number, v: number): V3 => (plane === 'x' ? [0, -u, v] : plane === 'y' ? [u, 0, v] : [u, -v, 0]);
  const ax = plane === 'x' ? [1, 2] : plane === 'y' ? [0, 2] : [0, 1];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * (Math.PI / 2);
    const c = Math.cos(t), s = Math.sin(t);
    pos.push(...map(outer[ax[0]] * c, outer[ax[1]] * s), ...map(inner[ax[0]] * c, inner[ax[1]] * s));
    if (i < N) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export type CutawayState = {
  layerGlow: Partial<Record<'scalp' | 'skull' | 'dura', number>>;
  vesselGlow: number;
  nerveGrow: number;
  nerves: boolean;
  brainGlow: number;
  brainColor: string;
};

export const Cutaway: React.FC<{ world: THREE.Matrix4; state: CutawayState; id: string }> = ({ world, state, id }) => {
  // clipping planes live in three.js world space
  const planes = useMemo(() => {
    const conv = new THREE.Matrix4().makeRotationX(-Math.PI / 2).multiply(world);
    return [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)].map((p) => p.applyMatrix4(conv));
  }, [world]);
  const shells = useMemo(() => new THREE.SphereGeometry(1, 48, 32), []);
  const caps = useMemo(() => {
    const out: Array<{ g: THREE.BufferGeometry; layer: keyof typeof CUT_RADII }> = [];
    for (const layer of ['scalp', 'skull', 'dura'] as const) {
      const o = CUT_RADII[layer];
      const t = THICK[layer];
      const inner: V3 = [o[0] - t, o[1] - t, o[2] - t];
      for (const pl of ['x', 'y', 'z'] as const) out.push({ g: capGeometry(pl, o, inner), layer });
    }
    return out;
  }, []);
  const brain = useMemo(() => buildBrain(3), []);
  const vessels = useMemo(() => vesselCurves([0.69, 0.86, 0.75]), []);
  const nerves = useMemo(() => nerveCurves([0.7, 0.87, 0.76]), []);
  return (
    <group>
      {(['scalp', 'skull', 'dura'] as const).map((layer) => {
        const m = toon(LAYER_COLORS[layer], { unique: `${id}_${layer}`, side: THREE.DoubleSide, clip: planes });
        m.transparent = false;
        m.emissive.set(layer === 'dura' ? '#7FC8FF' : '#FFD447');
        m.emissiveIntensity = (state.layerGlow[layer] ?? 0) * 0.6;
        const r = CUT_RADII[layer];
        return (
          <group key={layer}>
            <mesh geometry={shells} material={m} scale={r} receiveShadow />
            <mesh geometry={shells} material={outlineMat(0.01, undefined, planes)} scale={r} />
          </group>
        );
      })}
      {caps.map(({ g, layer }, i) => {
        const m = toon(CAP_COLORS[layer], { side: THREE.DoubleSide, emissive: layer === 'dura' ? '#7FC8FF' : '#FFD447', emissiveIntensity: (state.layerGlow[layer] ?? 0) * 0.6 });
        return <mesh key={i} geometry={g} material={m} />;
      })}
      {/* rim lines on the caps */}
      <group position={[0, 0.02, -0.02]} scale={[1.15, 1.18, 1.08]}>
        <Brain geo={brain} glow={state.brainGlow} color={state.brainColor} id={`${id}_brain`} />
      </group>
      {vessels.map((v, i) => (
        <Tube key={i} curve={v.curve} radius={0.017 * v.w} color="#E5484D" emissive={0.2 + state.vesselGlow * 0.8} outline={v.w > 0.8} segs={40} />
      ))}
      {state.nerves && nerves.map((c, i) => <Tube key={`n${i}`} curve={c} radius={i === nerves.length - 1 ? 0.03 : 0.02} color={PAL.yellow} emissive={0.6} grow={Math.max(0, Math.min(1, state.nerveGrow * (nerves.length + 2) / 3 - i * 0.25))} />)}
    </group>
  );
};

export const CUT_ANCHORS: Record<string, V3> = {
  scalp: ellipsoidPoint(new THREE.Vector3(0.2, -0.9, 0.05), CUT_RADII.scalp).toArray() as V3,
  skull: ellipsoidPoint(new THREE.Vector3(0.9, -0.15, 0.06), CUT_RADII.skull).multiplyScalar(0.98).toArray() as V3,
  dura: ellipsoidPoint(new THREE.Vector3(0.45, -0.25, 0.85), CUT_RADII.dura).toArray() as V3,
  vessels: ellipsoidPoint(new THREE.Vector3(0.62, -0.62, 0.45), [0.69, 0.86, 0.75]).toArray() as V3,
  brain: [0.22, -0.32, 0.3],
  nerve: ellipsoidPoint(new THREE.Vector3(0.55, -0.8, 0.12), [0.7, 0.87, 0.76]).toArray() as V3,
};

export const BRAIN_ANCHORS: Record<string, V3> = {
  frontal: [0.28, -0.42, 0.22], parietal: [0.25, 0.12, 0.4], temporal: [0.48, -0.08, -0.17], occipital: [0.18, 0.6, 0.05],
  cerebellum: [0.3, 0.45, -0.3], brainstem: [0, 0.26, -0.62], center: [0, 0, 0.05], top: [0, 0, 0.5],
};

export const nerveCurvesFor = nerveCurves;
