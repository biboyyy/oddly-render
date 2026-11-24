// Keyframe tracks for cinematic scenes. Keys are already resolved to
// scene-local frames by the pipeline (storyboard cues like "w:word" -> frame).
export type Key = { at: number; ease?: 'linear' | 'inOut' | 'in' | 'out' | 'back' | 'smooth' | 'expoOut' } & Record<string, any>;

const easeFn = (e: Key['ease'], t: number) => {
  switch (e) {
    case 'linear': return t;
    case 'in': return t * t * t;
    case 'out': return 1 - Math.pow(1 - t, 3);
    // ep024 camera/object presets: overshoot-and-settle, quintic (very soft start/stop), fast-out (whip pans)
    case 'back': { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
    case 'smooth': return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2;
    case 'expoOut': return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
    default: return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
};
const lerp = (a: any, b: any, t: number): any =>
  Array.isArray(a) ? a.map((v, i) => lerp(v, b?.[i] ?? v, t)) : typeof a === 'number' && typeof b === 'number' ? a + (b - a) * t : t < 0.5 ? a : b;

/** value of `field` at frame f; holds before the first / after the last key */
export function sample<T = any>(keys: Key[] | undefined, field: string, f: number, fallback: T): T {
  const ks = (keys ?? []).filter((k) => k[field] !== undefined).sort((a, b) => a.at - b.at);
  if (!ks.length) return fallback;
  if (f <= ks[0].at) return ks[0][field];
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1];
    if (f < b.at) return lerp(a[field], b[field], easeFn(b.ease, (f - a.at) / Math.max(1, b.at - a.at)));
  }
  return ks[ks.length - 1][field];
}

/** deterministic smooth noise for handheld camera shake */
export function noise1(x: number, seed = 0) {
  const h = (n: number) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), fr = x - i, u = fr * fr * (3 - 2 * fr);
  return (h(i) * (1 - u) + h(i + 1) * u) * 2 - 1;
}

export const DEG = Math.PI / 180;
