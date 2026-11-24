// Toon cast (existing ODDLY rig: Dimas, Ibu, ...) placed inside a cinematic scene.
// Actor configs use the legacy storyboard actor syntax (Z-up set coords, metres),
// so timelines (talk, look_at, arms, expr, walk...) work unchanged.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCurrentFrame } from 'remotion';
import { World } from '../three/world';
import { Character } from '../three/Character';
import { GLBModel } from './GLBModel';
import { AttachObj } from './GpsFx';
import { DEG, Key, sample } from './tracks';

const CONV = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
export type CastSpec = {
  type: 'cast'; id: string;
  keys?: Key[]; // group pos [x,y,z] (three coords, Y up), rot [deg]
  actors: Array<Record<string, any>>;
  attach?: Array<{ id: string; src?: string; box?: { size: number[]; color?: string; emissive?: string }; to: string; offset?: number[]; rot?: number[]; fit?: { size?: number; height?: number; ground?: boolean } }>;
};

export const Cast: React.FC<{ o: CastSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const world = useMemo(
    () => new World({ id: o.id, frames: 99999, sets: { main: [0, 0, 0] }, actors: o.actors.map((a) => ({ ...a, set: 'main' })) as any, props: [], shots: [{ at: 0, set: 'main', keys: [{ at: 0, pos: [0, -3, 1.5], aim: [0, 0, 1] }] }] }),
    [o],
  );
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const scl = sample<number>(o.keys, 'scale', frame, 1);
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={scl}>
      <group matrixAutoUpdate={false} matrix={CONV}>
        {Object.entries(world.actors).map(([id, a]) => (
          <Character key={id} id={id} look={a.look} pose={a.poseAt(frame)} />
        ))}
        {(o.attach ?? []).map((at) => {
          const p = world.ref(at.to, frame);
          const off = at.offset ?? [0, 0, 0];
          const vis = sample<number>((at as any).keys, 'visible', frame, 1); // optional show/hide keys (sw06)
          // ep022: optional keyed rotation (deg, e.g. hammer swing) applied around `pivot` (attach-local metres, Y up)
          const rk = ((at as any).keys ?? []).some((k: any) => k.rot) ? sample<number[]>((at as any).keys, 'rot', frame, [0, 0, 0]) : null;
          const pv = (at as any).pivot as number[] | undefined;
          if (rk || pv) {
            const inner = at.src ? <GLBModel spec={{ id: at.id, src: at.src, fit: at.fit ?? { size: 0.3, ground: false }, keys: [{ at: 0, rot: at.rot ?? [0, 0, 0] }] }} />
              : <mesh rotation={[(at.rot?.[0] ?? 0) * DEG, (at.rot?.[1] ?? 0) * DEG, (at.rot?.[2] ?? 0) * DEG]} castShadow><boxGeometry args={(at.box?.size ?? [0.05, 0.05, 0.2]) as any} /><meshStandardMaterial color={at.box?.color ?? '#333'} emissive={at.box?.emissive ?? '#000'} /></mesh>;
            const r = rk ?? [0, 0, 0];
            return (
              <group key={at.id} position={[p.x + off[0], p.y + off[1], p.z + off[2]]} rotation={[Math.PI / 2, 0, 0]} visible={vis > 0.5}>
                <group rotation={[r[0] * DEG, r[1] * DEG, r[2] * DEG]}><group position={(pv ?? [0, 0, 0]) as any}>{inner}</group></group>
              </group>
            );
          }
          return (
            <group key={at.id} position={[p.x + off[0], p.y + off[1], p.z + off[2]]} rotation={[Math.PI / 2, 0, 0]} visible={vis > 0.5}>
              {(at as any).obj ? <group rotation={[(at.rot?.[0] ?? 0) * DEG, (at.rot?.[1] ?? 0) * DEG, (at.rot?.[2] ?? 0) * DEG]}><AttachObj o={(at as any).obj} /></group>
                : at.src ? <GLBModel spec={{ id: at.id, src: at.src, fit: at.fit ?? { size: 0.3, ground: false }, keys: [{ at: 0, rot: at.rot ?? [0, 0, 0] }] }} />
                : <mesh rotation={[(at.rot?.[0] ?? 0) * DEG, (at.rot?.[1] ?? 0) * DEG, (at.rot?.[2] ?? 0) * DEG]} castShadow><boxGeometry args={(at.box?.size ?? [0.05, 0.05, 0.2]) as any} /><meshStandardMaterial color={at.box?.color ?? '#333'} emissive={at.box?.emissive ?? '#000'} /></mesh>}
            </group>
          );
        })}
      </group>
    </group>
  );
};

/** 3D rain: deterministic streaks in a box around `center`, falling with `wind`. */
export const Rain: React.FC<{ o: { id: string; count?: number; box?: number[]; center?: number[]; speed?: number; wind?: number[]; color?: string; opacity?: number; len?: number } }> = ({ o }) => {
  const frame = useCurrentFrame();
  const n = o.count ?? 2500;
  const [bx, by, bz] = o.box ?? [16, 10, 16];
  const seeds = useMemo(() => {
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: n }, () => [r(), r(), r(), 0.75 + r() * 0.5]);
  }, [n]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    return g;
  }, [n]);
  const c = o.center ?? [0, 0, 0];
  const v = o.speed ?? 9; // m/s
  const w = o.wind ?? [0.8, 0, 0.3];
  const L = o.len ?? 0.35;
  const arr = geo.attributes.position.array as Float32Array;
  const t = frame / 30;
  seeds.forEach(([a, b, d, sp], i) => {
    const y = by - (((b * by + t * v * sp) % by) + by) % by; // 0..by falling
    const x = c[0] + (a - 0.5) * bx + w[0] * (y / v) * 0.5;
    const z = c[2] + (d - 0.5) * bz + w[2] * (y / v) * 0.5;
    const yy = c[1] + y;
    arr.set([x, yy, z, x - w[0] * L / v * 3, yy + L * sp, z - w[2] * L / v * 3], i * 6);
  });
  geo.attributes.position.needsUpdate = true;
  return (
    <lineSegments geometry={geo} frustumCulled={false}>
      <lineBasicMaterial color={o.color ?? '#cfe0ff'} transparent opacity={o.opacity ?? 0.45} depthWrite={false} />
    </lineSegments>
  );
};

/** simple emissive / solid box: screens, light panels, walls, floors.
 *  shape 'sphere' | 'cylinder' | 'capsule' reuse size as [w, h, d] (ellipsoid / radius from w,d).
 *  keys may animate pos, rot, scale (number), glow, opacity. */
export const Box: React.FC<{ o: { id: string; size: number[]; shape?: 'box' | 'sphere' | 'cylinder' | 'capsule'; color?: string; emissive?: string; emissiveIntensity?: number; roughness?: number; metalness?: number; opacity?: number; keys?: Key[]; shadow?: boolean } }> = ({ o }) => {
  const frame = useCurrentFrame();
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const sc = sample<number>(o.keys, 'scale', frame, 1);
  const ei = sample<number>(o.keys, 'glow', frame, o.emissiveIntensity ?? (o.emissive ? 1 : 0));
  const op = sample<number>(o.keys, 'opacity', frame, o.opacity ?? 1);
  if (sc <= 0.001 || op <= 0.001) return null;
  const [w, h, d] = o.size;
  const shape = o.shape ?? 'box';
  const geoScale: [number, number, number] = shape === 'sphere' ? [w, h, d] : shape === 'box' ? [1, 1, 1] : [w, 1, d];
  return (
    <mesh position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={[geoScale[0] * sc, geoScale[1] * sc, geoScale[2] * sc]} castShadow={o.shadow !== false} receiveShadow>
      {shape === 'sphere' ? <sphereGeometry args={[0.5, 40, 28]} /> : shape === 'cylinder' ? <cylinderGeometry args={[0.5, 0.5, h, 40]} /> : shape === 'capsule' ? <capsuleGeometry args={[0.5, Math.max(0.001, h - 1), 10, 24]} /> : <boxGeometry args={o.size as any} />}
      <meshStandardMaterial color={o.color ?? '#888'} emissive={o.emissive ?? '#000'} emissiveIntensity={ei} roughness={o.roughness ?? 0.8} metalness={o.metalness ?? 0} toneMapped={!o.emissive} transparent={op < 1} opacity={op} depthWrite={op >= 1} />
    </mesh>
  );
};

/** rising steam wisps (soft additive sprites) above a bowl / pot */
export const Steam: React.FC<{ o: { id: string; pos: number[]; count?: number; height?: number; size?: number; opacity?: number } }> = ({ o }) => {
  const frame = useCurrentFrame();
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
  const n = o.count ?? 14, H = o.height ?? 0.45, S = o.size ?? 0.12;
  const t = frame / 30;
  return (
    <group position={o.pos as any}>
      {Array.from({ length: n }, (_, k) => {
        const life = ((t * 0.45 + k / n) % 1);
        const x = Math.sin(k * 12.9 + t * 1.3) * 0.03 * (1 + life * 2);
        const z = Math.cos(k * 7.1 + t * 1.1) * 0.03 * (1 + life * 2);
        return (
          <sprite key={k} position={[x, life * H, z]} scale={S * (0.6 + life * 1.6)}>
            <spriteMaterial map={tex} transparent depthWrite={false} opacity={(o.opacity ?? 0.35) * Math.sin(Math.PI * life)} />
          </sprite>
        );
      })}
    </group>
  );
};

/** flat sign with canvas-rendered text (e.g. "MIE AYAM PAK DARTO") */
export const Sign: React.FC<{ o: { id: string; text: string; size: number[]; bg?: string; fg?: string; glow?: number; keys?: Key[]; font?: string } }> = ({ o }) => {
  const frame = useCurrentFrame();
  const tex = useMemo(() => {
    const [w, h] = o.size; const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
    const g = c.getContext('2d')!; g.fillStyle = o.bg ?? '#C8102E'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = o.fg ?? '#FFF3D6'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = o.text.split('\n'); let fs = Math.min(c.height / (lines.length * 1.25), 150);
    g.font = `900 ${fs}px ${o.font ?? 'Montserrat, sans-serif'}`;
    // shrink to fit the widest line (long lines used to clip at the edges)
    const wMax = Math.max(...lines.map((l) => g.measureText(l).width));
    if (wMax > c.width * 0.92) { fs = Math.floor(fs * (c.width * 0.92) / wMax); g.font = `900 ${fs}px ${o.font ?? 'Montserrat, sans-serif'}`; }
    lines.forEach((l, i) => g.fillText(l, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * fs * 1.15));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [o.text, o.size[0], o.size[1]]);
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const vis = sample<number>(o.keys, 'visible', frame, 1);
  return (
    <mesh position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} visible={vis > 0.5}>
      <planeGeometry args={o.size as any} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive={'#ffffff'} emissiveIntensity={o.glow ?? 0.6} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ------------------------------------------------------------------ fire, embers, smoke
const softTex = (inner: string, outer: string) => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(0.45, inner.replace(/[\d.]+\)$/, '0.55)')); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
};
const hrand = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

/** flame field: additive billboards rising over an area (w × d), flickering light; deterministic per frame */
export const Fire: React.FC<{ o: { id: string; pos: number[]; size?: number[]; height?: number; count?: number; scale?: number; light?: number; keys?: Key[] } }> = ({ o }) => {
  const frame = useCurrentFrame();
  const tex = useMemo(() => {
    // teardrop flame: bright narrow core, soft tall falloff
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d')!;
    g.save(); g.translate(32, 84); g.scale(1, 2.1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 30);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill(); g.restore();
    return new THREE.CanvasTexture(c);
  }, []);
  const [w, d] = o.size ?? [3, 1];
  const H = o.height ?? 2.2, n = o.count ?? 70, S = o.scale ?? 1;
  const grow = sample<number>(o.keys, 'grow', frame, 1);
  const t = frame / 30;
  const flick = 0.75 + 0.25 * Math.sin(t * 13.1) * Math.sin(t * 7.3 + 1) + 0.1 * Math.sin(t * 23.7);
  const cols = ['#fff3c4', '#ffd36b', '#ff9a2e', '#ff5a1a', '#c2260f'];
  return (
    <group position={o.pos as any}>
      {(o.light ?? 1) > 0 && <pointLight position={[0, H * 0.45, 0.4]} color="#ff8a33" intensity={(o.light ?? 1) * 14 * flick * grow} distance={18} decay={1.6} />}
      {Array.from({ length: n }, (_, k) => {
        const life = ((t * (0.9 + hrand(k) * 0.8) + hrand(k + 7)) % 1);
        const x = (hrand(k + 1) - 0.5) * w + Math.sin(t * 5 + k) * 0.06 * life;
        const z = (hrand(k + 2) - 0.5) * d;
        const y = Math.pow(life, 1.4) * H * (0.5 + hrand(k + 3) * 0.5) * grow;
        const sz = S * (0.5 + hrand(k + 4) * 0.5) * (1 - life * 0.7) * grow;
        const ci = Math.min(cols.length - 1, Math.floor(life * cols.length + hrand(k) * 0.6));
        return (
          <sprite key={k} position={[x, y + sz * 0.7, z]} scale={[sz * 0.6, sz * 1.6, 1]}>
            <spriteMaterial map={tex} color={cols[ci]} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.85 * Math.sin(Math.PI * Math.min(1, life * 1.15))} toneMapped={false} />
          </sprite>
        );
      })}
    </group>
  );
};

/** glowing embers drifting up & sideways across a box */
export const Embers: React.FC<{ o: { id: string; center?: number[]; box?: number[]; count?: number; speed?: number; wind?: number[]; size?: number; color?: string; additive?: boolean } }> = ({ o }) => {
  const frame = useCurrentFrame();
  const n = o.count ?? 160; const [bx, by, bz] = o.box ?? [10, 6, 10]; const c = o.center ?? [0, 0, 0];
  const v = o.speed ?? 0.9; const wnd = o.wind ?? [0.6, 0, 0.2];
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); return g; }, [n]);
  const arr = geo.attributes.position.array as Float32Array; const t = frame / 30;
  for (let k = 0; k < n; k++) {
    const y = ((((hrand(k) * by + t * v * (0.6 + hrand(k + 9))) % by) + by) % by);
    arr[k * 3] = c[0] + (hrand(k + 1) - 0.5) * bx + wnd[0] * y + Math.sin(t * 2 + k) * 0.15;
    arr[k * 3 + 1] = c[1] + y;
    arr[k * 3 + 2] = c[2] + (hrand(k + 2) - 0.5) * bz + wnd[2] * y;
  }
  geo.attributes.position.needsUpdate = true;
  return <points geometry={geo} frustumCulled={false}><pointsMaterial size={o.size ?? 0.06} color={o.color ?? '#ffb347'} transparent opacity={0.95} blending={o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></points>;
};

/** big soft smoke puffs drifting slowly (normal blending) */
export const Smoke: React.FC<{ o: { id: string; center?: number[]; box?: number[]; count?: number; size?: number; color?: string; opacity?: number; rise?: number; drift?: number[] } }> = ({ o }) => {
  const frame = useCurrentFrame();
  const tex = useMemo(() => softTex('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'), []);
  const n = o.count ?? 40; const [bx, by, bz] = o.box ?? [16, 5, 16]; const c = o.center ?? [0, 0, 0];
  const t = frame / 30; const dr = o.drift ?? [0.25, 0, 0.05];
  return (
    <group>
      {Array.from({ length: n }, (_, k) => {
        const life = ((t * (o.rise ?? 0.04) + hrand(k + 5)) % 1);
        const x = c[0] + (hrand(k) - 0.5) * bx + dr[0] * t; const z = c[2] + (hrand(k + 1) - 0.5) * bz + dr[2] * t;
        const y = c[1] + hrand(k + 2) * by * 0.5 + life * by * 0.5;
        const sz = (o.size ?? 4) * (0.6 + hrand(k + 3) * 0.8) * (0.7 + life * 0.6);
        return (
          <sprite key={k} position={[((x - c[0] + bx * 1.5) % bx) - bx / 2 + c[0], y, z]} scale={[sz, sz, 1]}>
            <spriteMaterial map={tex} color={o.color ?? '#b08a5a'} transparent depthWrite={false} opacity={(o.opacity ?? 0.35) * Math.sin(Math.PI * life)} />
          </sprite>
        );
      })}
    </group>
  );
};

/** tumbling burning twigs / branches / leaves blown by wind (glowing tips) */
export const Debris: React.FC<{ o: { id: string; center?: number[]; box?: number[]; count?: number; wind?: number[]; speed?: number; size?: number; burst?: number } }> = ({ o }) => {
  const frame = useCurrentFrame();
  const n = o.count ?? 40; const [bx, by, bz] = o.box ?? [14, 6, 10]; const c = o.center ?? [0, 0, 0];
  const w = o.wind ?? [3.5, 0.6, 0.8]; const t = frame / 30; const S = o.size ?? 1;
  return (
    <group>
      {Array.from({ length: n }, (_, k) => {
        const per = bx / Math.max(0.5, Math.abs(w[0]) * (0.6 + hrand(k + 3) * 0.8));
        const life = (((t / per) + hrand(k)) % 1);
        const x = c[0] - bx / 2 + life * bx * Math.sign(w[0] || 1);
        const y = c[1] + 0.3 + hrand(k + 1) * by + Math.sin(t * 2.3 + k) * 0.4 + w[1] * life * 2;
        const z = c[2] + (hrand(k + 2) - 0.5) * bz + w[2] * life * 2;
        const len = S * (0.15 + hrand(k + 4) * 0.55);
        const leaf = hrand(k + 6) > 0.6;
        const rx = t * (3 + hrand(k + 7) * 6), rz = t * (2 + hrand(k + 8) * 5);
        const fade = Math.sin(Math.PI * life);
        return (
          <group key={k} position={[x, y, z]} rotation={[rx, 0, rz]} scale={fade < 0.05 ? 0.001 : 1}>
            {leaf ? (
              <mesh><planeGeometry args={[len * 0.5, len * 0.3]} /><meshBasicMaterial color={hrand(k) > 0.5 ? '#ff7a1a' : '#3a2a1e'} side={THREE.DoubleSide} transparent opacity={0.9 * fade} toneMapped={false} /></mesh>
            ) : (
              <>
                <mesh><boxGeometry args={[len, 0.025 * S, 0.025 * S]} /><meshStandardMaterial color="#2a1d14" roughness={1} /></mesh>
                <mesh position={[len / 2, 0, 0]}><sphereGeometry args={[0.03 * S, 6, 6]} /><meshBasicMaterial color="#ff9a33" toneMapped={false} /></mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
};


/** exhaled smoke puff: soft sprites burst from `pos` at frame `at` (resolved), drift along `dir`, expand and fade. */
export const Puff: React.FC<{ o: { id: string; pos: number[]; at: number; dur?: number; dir?: number[]; count?: number; size?: number; opacity?: number; color?: string } }> = ({ o }) => {
  const frame = useCurrentFrame();
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
  const n = o.count ?? 22, S = o.size ?? 0.09, D = (o.dur ?? 4) * 30, dir = o.dir ?? [0, 0.25, -0.5];
  const t = frame - o.at;
  if (t < 0 || t > D + 30) return null;
  return (
    <group position={o.pos as any}>
      {Array.from({ length: n }, (_, k) => {
        const delay = (k / n) * 18;                       // ~0.6 s exhale stream
        const lt = t - delay; if (lt < 0) return null;
        const life = Math.min(1, lt / D);
        const e = 1 - Math.pow(1 - Math.min(1, lt / 20), 2); // fast initial push
        const push = 0.35 * e + life * 0.6;
        const sw = Math.sin(k * 3.7 + lt * 0.05) * 0.08 * life;
        const p = [dir[0] * push + sw, dir[1] * push + life * life * 0.5, dir[2] * push + Math.cos(k * 5.1 + lt * 0.04) * 0.06 * life];
        const op = (o.opacity ?? 0.22) * Math.min(1, lt / 6) * (1 - life);
        return (
          <sprite key={k} position={p as any} scale={S * (0.5 + life * 5)}>
            <spriteMaterial map={tex} color={o.color ?? '#dfe4ec'} transparent depthWrite={false} opacity={op} />
          </sprite>
        );
      })}
    </group>
  );
};


/** Laptop trading screen: procedural candlestick chart + balance, drawn per frame onto a CanvasTexture.
 *  Times in seconds (scene-local). Emits its own screen light (green -> red after the crash). */
export const TradeScreen: React.FC<{ o: { id: string; pos: number[]; rot?: number[]; size: number[]; crash: number; liq: number;
  start: number; end: number; pair?: string; light?: number } }> = ({ o }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 800;
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    return { canvas: c, tex: tx };
  }, []);
  // deterministic price series: one candle per 0.25 s
  const N = Math.floor(t / 0.25) + 1;
  const prices: number[] = [];
  let p = 100;
  for (let i = 0; i < 400; i++) {
    const ti = i * 0.25;
    const noise = (hrand(i + 3) - 0.5) * 0.9;
    if (ti < o.crash) p += 0.12 + noise;                          // slow grind up (greed)
    else if (ti < o.crash + 1.6) p -= 2.4 + hrand(i) * 2.2;        // waterfall
    else if (ti < o.liq) p += (hrand(i) - 0.62) * 2.2;             // dead-cat bounces, still bleeding
    else p += (hrand(i) - 0.5) * 0.8;
    prices.push(p);
  }
  const g = canvas.getContext('2d')!;
  const W = canvas.width, H = canvas.height;
  g.fillStyle = '#0b0e14'; g.fillRect(0, 0, W, H);
  // top bar
  g.fillStyle = '#131722'; g.fillRect(0, 0, W, 70);
  g.font = '700 30px Montserrat, sans-serif'; g.fillStyle = '#e6e8ee'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(o.pair ?? 'BTC/USDT  PERP', 28, 35);
  g.fillStyle = '#f0b90b'; g.fillText('100x', 330, 35);
  g.fillStyle = '#8a91a3'; g.font = '500 24px Montserrat, sans-serif'; g.fillText('LONG  ·  Cross', 420, 35);
  // chart area
  const cx0 = 20, cy0 = 90, cw = 900, ch = 560;
  g.strokeStyle = '#1c2230'; g.lineWidth = 1;
  for (let k = 0; k <= 6; k++) { g.beginPath(); g.moveTo(cx0, cy0 + k * ch / 6); g.lineTo(cx0 + cw, cy0 + k * ch / 6); g.stroke(); }
  const vis = 56, i1 = Math.min(N, 400), i0 = Math.max(0, i1 - vis);
  const win = prices.slice(Math.max(0, i0 - 1), i1);
  const mn = Math.min(...win) - 3, mx = Math.max(...win) + 3;
  const Y = (v: number) => cy0 + ch - ((v - mn) / (mx - mn)) * ch;
  const bw = cw / vis;
  for (let i = i0; i < i1; i++) {
    const op = i > 0 ? prices[i - 1] : 100;
    let cl = prices[i];
    if (i === i1 - 1) cl = op + (cl - op) * ((t % 0.25) / 0.25);     // live candle
    const hi = Math.max(op, cl) + hrand(i * 7) * 1.2, lo = Math.min(op, cl) - hrand(i * 11) * 1.2;
    const x = cx0 + (i - i0) * bw + bw / 2, up = cl >= op;
    g.strokeStyle = g.fillStyle = up ? '#0ecb81' : '#f6465d';
    g.beginPath(); g.moveTo(x, Y(hi)); g.lineTo(x, Y(lo)); g.stroke();
    g.fillRect(x - bw * 0.35, Math.min(Y(op), Y(cl)), bw * 0.7, Math.max(2, Math.abs(Y(op) - Y(cl))));
  }
  // entry + liquidation lines
  const entry = prices[Math.max(0, Math.floor(o.crash / 0.25) - 18)];
  const liqP = prices[Math.floor(o.liq / 0.25)] + 0.5;
  g.setLineDash([10, 8]); g.lineWidth = 2;
  if (entry > mn && entry < mx) { g.strokeStyle = '#f0b90b'; g.beginPath(); g.moveTo(cx0, Y(entry)); g.lineTo(cx0 + cw, Y(entry)); g.stroke(); }
  if (liqP > mn && liqP < mx) { g.strokeStyle = '#a855f7'; g.beginPath(); g.moveTo(cx0, Y(liqP)); g.lineTo(cx0 + cw, Y(liqP)); g.stroke();
    g.fillStyle = '#a855f7'; g.font = '700 20px Montserrat, sans-serif'; g.fillText('LIQ', cx0 + cw - 50, Y(liqP) - 14); }
  g.setLineDash([]);
  // right panel: balance + pnl
  const k = t < o.crash ? 1 + 0.02 * (t / Math.max(1, o.crash))
    : t < o.liq ? 1.02 - (1.02 - (o.end / o.start) * 1.6) * Math.pow((t - o.crash) / (o.liq - o.crash), 0.6)
    : o.end / o.start;
  const bal = Math.max(o.end, o.start * k);
  const pnl = bal - o.start;
  const fmt = (v: number) => 'Rp ' + Math.round(Math.abs(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const px = 950;
  g.fillStyle = '#131722'; g.fillRect(px - 10, 90, W - px - 10, 560);
  g.fillStyle = '#8a91a3'; g.font = '500 24px Montserrat, sans-serif'; g.fillText('Saldo Akun', px + 10, 130);
  g.fillStyle = '#ffffff'; g.font = '800 30px Montserrat, sans-serif'; g.fillText(fmt(bal), px + 10, 175);
  g.fillStyle = '#8a91a3'; g.font = '500 24px Montserrat, sans-serif'; g.fillText('PnL Belum Terealisasi', px + 10, 240);
  g.fillStyle = pnl >= 0 ? '#0ecb81' : '#f6465d'; g.font = '800 32px Montserrat, sans-serif';
  g.fillText((pnl >= 0 ? '+' : '−') + fmt(pnl), px + 10, 285);
  g.font = '800 44px Montserrat, sans-serif'; g.fillText((pnl >= 0 ? '+' : '−') + Math.abs(pnl / o.start * 100).toFixed(1) + '%', px + 10, 345);
  g.fillStyle = '#8a91a3'; g.font = '500 22px Montserrat, sans-serif'; g.fillText('dari saldo awal', px + 10, 385);
  // buttons
  g.fillStyle = '#0ecb81'; g.fillRect(px + 10, 560, 140, 60); g.fillStyle = '#f6465d'; g.fillRect(px + 165, 560, 140, 60);
  g.fillStyle = '#fff'; g.font = '800 24px Montserrat, sans-serif'; g.textAlign = 'center';
  g.fillText('BUY', px + 80, 590); g.fillText('SELL', px + 235, 590); g.textAlign = 'left';
  // bottom ticker
  g.fillStyle = '#131722'; g.fillRect(0, 670, W, 130);
  g.fillStyle = '#8a91a3'; g.font = '500 22px Montserrat, sans-serif';
  g.fillText('Posisi  ·  Order  ·  Riwayat', 28, 710);
  // liquidation banner
  if (t >= o.liq) {
    const fl = Math.floor((t - o.liq) * 2.5) % 2 === 0 ? 1 : 0.75;
    g.fillStyle = `rgba(160, 14, 32, ${0.82 * fl})`; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = '900 96px Montserrat, sans-serif';
    g.fillText('POSISI', W / 2, H / 2 - 150); g.fillText('DILIKUIDASI', W / 2, H / 2 - 50);
    g.font = '800 56px Montserrat, sans-serif'; g.fillText('−' + fmt(o.start - o.end), W / 2, H / 2 + 50);
    g.font = '500 32px Montserrat, sans-serif'; g.fillText('Margin tidak mencukupi', W / 2, H / 2 + 120);
    g.textAlign = 'left';
  }
  tex.needsUpdate = true;
  const rot = o.rot ?? [0, 0, 0];
  const red = t >= o.crash;
  const flick = t >= o.liq ? (Math.floor((t - o.liq) * 2.5) % 2 === 0 ? 1.2 : 0.8) : 1;
  return (
    <group position={o.pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]}>
      <mesh>
        <planeGeometry args={o.size as any} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 0.25]} color={t >= o.liq ? '#ff2a3a' : red ? '#ff6a7a' : '#9fd8ff'} intensity={(o.light ?? 2.2) * flick} distance={3.2} decay={1.6} />
    </group>
  );
};
