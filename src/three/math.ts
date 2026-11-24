// Deterministic math helpers for frame-based animation (Remotion renders
// frames out of order, so everything must be a pure function of frame).
import * as THREE from 'three';

export type V3 = [number, number, number];

export const ease = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** optional per-key easings (ep024 "life" motion): overshoot-and-settle gestures, snappy outs */
export const EASES: Record<string, (t: number) => number> = {
  smooth: ease,
  linear: (t) => Math.max(0, Math.min(1, t)),
  outBack: (t) => { t = Math.max(0, Math.min(1, t)); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outCubic: (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3),
  inOutQuint: (t) => { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; },
};

/** Keyframe track (like a Blender f-curve with auto-clamped handles). */
export class Track<T extends number | number[]> {
  keys: { f: number; v: T; e?: string }[] = [];
  constructor(public initial: T) {}
  /** e: optional easing name (EASES) for the segment that ENDS at this key; default smoothstep */
  set(f: number, v: T, e?: string) {
    const i = this.keys.findIndex((k) => k.f === f);
    if (i >= 0) this.keys[i] = e ? { f, v, e } : { f, v };
    else {
      this.keys.push(e ? { f, v, e } : { f, v });
      this.keys.sort((a, b) => a.f - b.f);
    }
  }
  /** value of the track at frame f (holding before first / after last key) */
  at(f: number, step = false): T {
    const k = this.keys;
    if (!k.length) return this.initial;
    if (f <= k[0].f) return k[0].v;
    if (f >= k[k.length - 1].f) return k[k.length - 1].v;
    let i = 0;
    while (i < k.length - 1 && k[i + 1].f <= f) i++;
    const a = k[i];
    const b = k[i + 1];
    if (step) return a.v;
    const t = (b.e ? EASES[b.e] ?? ease : ease)((f - a.f) / (b.f - a.f));
    if (typeof a.v === 'number') return lerp(a.v, b.v as number, t) as T;
    return (a.v as number[]).map((x, j) => lerp(x, (b.v as number[])[j], t)) as T;
  }
  /** last explicitly keyed value at or before f (state cache semantics) */
  last(): T {
    return this.keys.length ? this.keys[this.keys.length - 1].v : this.initial;
  }
}

/** mulberry32 seeded RNG */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Small 3D value-noise (smooth), deterministic.
const hash3 = (x: number, y: number, z: number) => {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
export const noise3 = (x: number, y: number, z: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(xf), v = s(yf), w = s(zf);
  let r = 0;
  for (let dx = 0; dx < 2; dx++)
    for (let dy = 0; dy < 2; dy++)
      for (let dz = 0; dz < 2; dz++) {
        const wgt = (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
        r += wgt * hash3(xi + dx, yi + dy, zi + dz);
      }
  return r * 2 - 1;
};

// Blender (Z-up, -Y forward) -> three.js (Y-up). We keep all authoring in
// Blender coordinates and convert only at the camera / root group.
export const toThree = (p: V3 | THREE.Vector3): THREE.Vector3 => {
  const [x, y, z] = Array.isArray(p) ? p : [p.x, p.y, p.z];
  return new THREE.Vector3(x, z, -y);
};

/** Blender camera lens (mm, vertical 24mm sensor) -> vertical fov degrees */
export const lensToFov = (lens: number) => (2 * Math.atan(12 / lens) * 180) / Math.PI;

export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
