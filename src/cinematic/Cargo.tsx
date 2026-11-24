// EP027 (Reg Spiers, 1964): air-cargo props — wooden crate (stencils, hinged lid, cut-away interior, shake),
// procedural 1960s four-engine jetliner, newspaper front page, heat haze. Additive module: old episodes untouched.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCurrentFrame } from 'remotion';
import { DEG, Key, noise1, sample } from './tracks';

const mkCanvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; };
const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const rnd = (seed: number) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

/** plank wood face: horizontal boards with seams, grain streaks, nail heads, optional stencil text */
function woodTexture(w: number, h: number, base: string, text?: string, seed = 7, stencil = '#2a1c12') {
  const W = 512, H = Math.max(64, Math.round(512 * h / w));
  const [c, g] = mkCanvas(W, H);
  const r = rnd(seed * 131 + 17);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  const boards = Math.max(2, Math.round(h / 0.15));
  const bh = H / boards;
  for (let b = 0; b < boards; b++) {
    const y0 = b * bh;
    g.fillStyle = `rgba(${r() < 0.5 ? '255,230,190' : '60,35,15'},${0.05 + r() * 0.08})`; g.fillRect(0, y0, W, bh);
    for (let k = 0; k < 14; k++) {   // grain
      g.strokeStyle = `rgba(70,42,20,${0.08 + r() * 0.12})`; g.lineWidth = 1 + r() * 1.5;
      const yy = y0 + r() * bh; g.beginPath(); g.moveTo(0, yy);
      for (let x = 0; x <= W; x += 32) g.lineTo(x, yy + Math.sin(x * 0.02 + k) * 2 * r());
      g.stroke();
    }
    if (r() < 0.6) { g.fillStyle = 'rgba(60,35,15,0.35)'; g.beginPath(); g.ellipse(r() * W, y0 + bh / 2, 7 + r() * 6, 4, 0, 0, Math.PI * 2); g.fill(); } // knot
    g.fillStyle = 'rgba(30,18,8,0.65)'; g.fillRect(0, y0, W, Math.max(2, bh * 0.05));   // seam
    g.fillStyle = '#3a3a3a';
    [10, W - 14].forEach((x) => { g.beginPath(); g.arc(x, y0 + bh / 2, 3.2, 0, Math.PI * 2); g.fill(); });   // nails
  }
  if (text) {
    const lines = text.split('\n');
    let fs = Math.min(H / (lines.length * 1.35), 90);
    g.font = `900 ${fs}px 'Courier New', monospace`;
    const wm = Math.max(...lines.map((l) => g.measureText(l).width));
    if (wm > W * 0.86) { fs = fs * W * 0.86 / wm; g.font = `900 ${fs}px 'Courier New', monospace`; }
    g.fillStyle = stencil; g.globalAlpha = 0.85; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 1.2));
    g.globalAlpha = 1;
  }
  return tex(c);
}

type CrateSpec = { id: string; size?: number[]; keys?: Key[]; color?: string; labels?: { front?: string; back?: string; side?: string; top?: string }; cut?: boolean; inner?: string; seed?: number; stencil?: string };
/** wooden shipping crate. size [L(x), H(y), D(z)], origin = bottom centre. keys: pos, rot (deg), lid (deg, hinge on back-top edge),
 *  shake (m jitter amplitude), lift (extra y). cut: hide front (+z) wall + lid for interior shots (inside faces darker). */
export const Crate: React.FC<{ o: CrateSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const [L, H, D] = o.size ?? [1.5, 0.9, 0.75];
  const base = o.color ?? '#b98b55';
  const T = useMemo(() => ({
    front: woodTexture(L, H, base, o.labels?.front, (o.seed ?? 1) + 1, o.stencil),
    back: woodTexture(L, H, base, o.labels?.back, (o.seed ?? 1) + 2, o.stencil),
    side: woodTexture(D, H, base, o.labels?.side, (o.seed ?? 1) + 3, o.stencil),
    top: woodTexture(L, D, base, o.labels?.top, (o.seed ?? 1) + 4, o.stencil),
    inner: woodTexture(L, H, o.inner ?? '#8a6238', undefined, (o.seed ?? 1) + 5),
  }), [o.id]);
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const lid = sample<number>(o.keys, 'lid', frame, 0);
  const sh = sample<number>(o.keys, 'shake', frame, 0);
  const lift = sample<number>(o.keys, 'lift', frame, 0);
  const j = sh > 0 ? [noise1(frame * 0.9, 1) * sh, Math.abs(noise1(frame * 1.3, 2)) * sh, noise1(frame * 0.8, 3) * sh * 0.5] : [0, 0, 0];
  const jr = sh > 0 ? noise1(frame * 1.1, 4) * sh * 25 : 0;
  const t = 0.035;  // board thickness
  const mat = (m: THREE.Texture, side = THREE.FrontSide) => <meshStandardMaterial map={m} roughness={0.85} side={side} />;
  const batten = '#7a5530';
  const edges: Array<[number[], number[]]> = [];
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) edges.push([[0, H / 2 + sy * (H / 2 - 0.03), sz * (D / 2 + 0.008)], [L + 0.02, 0.07, 0.03]]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) edges.push([[sx * (L / 2 - 0.03), H / 2, sz * (D / 2 + 0.008)], [0.07, H, 0.03]]);
  const cut = !!o.cut;
  return (
    <group position={[pos[0] + j[0], pos[1] + j[1] + lift, pos[2] + j[2]]} rotation={[rot[0] * DEG, rot[1] * DEG, (rot[2] + jr) * DEG]}>
      {/* walls */}
      <mesh position={[0, t / 2, 0]} castShadow receiveShadow><boxGeometry args={[L, t, D]} />{mat(T.top)}</mesh>
      <mesh position={[0, H / 2, -D / 2 + t / 2]} castShadow receiveShadow><boxGeometry args={[L, H, t]} />{mat(cut ? T.inner : T.back)}</mesh>
      {!cut && <mesh position={[0, H / 2, D / 2 - t / 2]} castShadow receiveShadow><boxGeometry args={[L, H, t]} />{mat(T.front)}</mesh>}
      {[-1, 1].map((sx) => <mesh key={sx} position={[sx * (L / 2 - t / 2), H / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow><boxGeometry args={[D, H, t]} />{mat(cut ? T.inner : T.side)}</mesh>)}
      {cut && <mesh position={[0, t + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[L - 2 * t, D - 2 * t]} /><meshStandardMaterial map={T.inner} roughness={0.9} /></mesh>}
      {/* battens on the outer edges (front battens hidden in cut-away mode) */}
      {edges.filter(([p]) => !(cut && p[2] > 0)).map(([p, s], i) => <mesh key={i} position={p as any} castShadow><boxGeometry args={s as any} /><meshStandardMaterial color={batten} roughness={0.9} /></mesh>)}
      {/* lid: hinge on the back-top edge */}
      {!cut && (
        <group position={[0, H, -D / 2]} rotation={[-lid * DEG, 0, 0]}>
          <mesh position={[0, t / 2, D / 2]} castShadow receiveShadow><boxGeometry args={[L + 0.02, t, D + 0.02]} />{mat(T.top)}</mesh>
          {[-1, 0, 1].map((k) => <mesh key={k} position={[k * (L / 2 - 0.08), t + 0.012, D / 2]} castShadow><boxGeometry args={[0.07, 0.025, D + 0.02]} /><meshStandardMaterial color={batten} roughness={0.9} /></mesh>)}
        </group>
      )}
      {/* rope handles on the short sides */}
      {!cut && [-1, 1].map((sx) => <mesh key={'h' + sx} position={[sx * (L / 2 + 0.03), H * 0.62, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.07, 0.012, 6, 16, Math.PI]} /><meshStandardMaterial color={'#c8b07a'} roughness={1} /></mesh>)}
    </group>
  );
};

type PlaneSpec = { id: string; keys?: Key[]; livery?: string; name?: string; length?: number; tail?: string };
const trapezoid = (pts: number[][], depth: number) => {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => s.lineTo(p[0], p[1])); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g;
};
/** procedural 1960s four-engine jetliner (707-class, ~44 m). Nose = +x, origin = ground under the wing root. keys: pos, rot (deg). */
export const Airliner: React.FC<{ o: PlaneSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const Lf = o.length ?? 40, R = 1.9;
  const liv = o.livery ?? '#c8102e';
  const body = useMemo(() => {
    // canvas: x = around (u 0 side +z, .25 belly, .5 side -z, .75 top), y = along length (top of canvas = nose)
    const [c, g] = mkCanvas(1024, 2048);
    const U = (u: number) => u * 1024;
    g.fillStyle = '#b8bcc2'; g.fillRect(0, 0, 1024, 2048);                       // bare-metal belly (u .02 -> .48)
    g.fillStyle = '#f4f2ee'; g.fillRect(U(0.53), 0, U(0.44), 2048);              // white upper half (u .53 -> .97, top = .75)
    for (const [u0, u1] of [[0.97, 1.0], [0.0, 0.02], [0.48, 0.53]]) { g.fillStyle = liv; g.fillRect(U(u0), 0, U(u1 - u0), 2048); }   // cheatlines
    // window rows (just above the cheatline on both sides)
    for (const u of [0.93, 0.565]) for (let y = 160; y < 1880; y += 34) { g.fillStyle = '#1d2630'; g.beginPath(); g.ellipse(U(u), y, 7, 10, 0, 0, Math.PI * 2); g.fill(); }
    // name along the top of each side
    g.fillStyle = liv; g.font = `900 70px Montserrat, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [u, a] of [[0.875, -Math.PI / 2], [0.625, Math.PI / 2]] as Array<[number, number]>) { g.save(); g.translate(U(u), 760); g.rotate(a); g.fillText(o.name ?? 'AIR-INDIA', 0, 0); g.restore(); }
    // panel lines
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2; for (let y = 100; y < 2048; y += 180) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
    // cargo door outline (aft, side +z lower)
    g.strokeStyle = 'rgba(40,40,40,0.6)'; g.lineWidth = 4; g.strokeRect(U(0.03), 1250, U(0.08), 170);
    return tex(c);
  }, [o.id, liv]);
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const yC = R + 1.6;  // fuselage centre height (gear)
  const metal = <meshStandardMaterial color={'#c9ccd1'} roughness={0.35} metalness={0.55} />;
  const wingG = useMemo(() => trapezoid([[2.2, 0], [-3.0, 0], [-10.5, 19], [-8.2, 19]], 0.45), []);
  const stabG = useMemo(() => trapezoid([[1.0, 0], [-2.6, 0], [-5.6, 6.5], [-4.2, 6.5]], 0.25), []);
  const finG = useMemo(() => trapezoid([[2.2, 0], [-3.4, 0], [-6.4, 7.0], [-4.6, 7.0]], 0.3), []);
  const engines = [[-3.3, -5.6], [-7.0, -12.4]];
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]}>
      <group position={[2, yC, 0]}>
        <mesh rotation={[0, 0, -Math.PI / 2]} castShadow receiveShadow><cylinderGeometry args={[R, R, Lf, 40, 1, true]} /><meshStandardMaterial map={body} roughness={0.35} metalness={0.25} side={THREE.DoubleSide} /></mesh>
        {/* nose + cockpit windows */}
        <mesh position={[Lf / 2, 0, 0]} scale={[2.6, 1, 1]} castShadow><sphereGeometry args={[R, 32, 20, 0, Math.PI * 2, 0, Math.PI]} /><meshStandardMaterial color={'#f4f2ee'} roughness={0.35} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[Lf / 2 + 3.35, 1.01, s * 0.96]} scale={[0.9, 0.45, 1]}><sphereGeometry args={[0.42, 16, 10]} /><meshStandardMaterial color={'#14202c'} roughness={0.15} metalness={0.4} /></mesh>)}
        {/* tail cone */}
        <mesh position={[-Lf / 2 - 4, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.35, R, 8, 32]} /><meshStandardMaterial color={'#f4f2ee'} roughness={0.35} /></mesh>
        {/* vertical fin with livery */}
        <mesh geometry={finG} position={[-Lf / 2 - 1.2, R * 0.6, 0]} castShadow><meshStandardMaterial color={o.tail ?? liv} roughness={0.4} /></mesh>
        {/* horizontal stabilisers */}
        {[-1, 1].map((s) => <mesh key={s} geometry={stabG} position={[-Lf / 2 - 2.4, 0.9, 0]} rotation={[s * Math.PI / 2, 0, 0]} castShadow>{metal}</mesh>)}
        {/* wings (swept trapezoids, slight dihedral) */}
        {[-1, 1].map((s) => (
          <group key={s} position={[1.5, -R * 0.55, 0]} rotation={[s * (Math.PI / 2 - 0.07), 0, 0]}>
            <mesh geometry={wingG} castShadow receiveShadow>{metal}</mesh>
          </group>
        ))}
        {/* four engine pods on pylons */}
        {engines.flatMap(([x, z]) => [-1, 1].map((s) => (
          <group key={`${x}${s}`} position={[x + 1.5, -R * 0.55 - 1.15 + Math.abs(z) * 0.07, s * Math.abs(z)]}>
            <mesh rotation={[0, 0, -Math.PI / 2]} castShadow><cylinderGeometry args={[0.62, 0.5, 4.2, 24]} />{metal}</mesh>
            <mesh position={[2.11, 0, 0]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[0.55, 24]} /><meshStandardMaterial color={'#151515'} side={THREE.DoubleSide} /></mesh>
            <mesh position={[0.4, 0.75, 0]} castShadow><boxGeometry args={[2.4, 1.1, 0.18]} />{metal}</mesh>
          </group>
        )))}
      </group>
      {/* landing gear */}
      {[[Lf / 2 - 2, 0], [-1.2, -2.6], [-1.2, 2.6]].map(([x, z], i) => (
        <group key={i} position={[x + 2, 0, z]}>
          <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.1, 0.1, 2.2, 10]} /><meshStandardMaterial color={'#555'} metalness={0.6} roughness={0.4} /></mesh>
          {[-0.35, 0.35].map((dz) => <mesh key={dz} position={[0, 0.5, dz]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.5, 0.5, 0.35, 20]} /><meshStandardMaterial color={'#1a1a1a'} roughness={0.9} /></mesh>)}
        </group>
      ))}
    </group>
  );
};

type PaperSpec = { id: string; size?: number[]; keys?: Key[]; masthead?: string; headline?: string; sub?: string; date?: string; photo?: string };
/** newspaper front page (canvas): masthead, date rule, giant headline, photo of the crate, text columns. keys: pos, rot, scale */
export const Newspaper: React.FC<{ o: PaperSpec }> = ({ o }) => {
  const frame = useCurrentFrame();
  const [w, h] = o.size ?? [0.6, 0.82];
  const t = useMemo(() => {
    const W = 1024, Hh = Math.round(1024 * h / w);
    const [c, g] = mkCanvas(W, Hh);
    g.fillStyle = '#efe7d4'; g.fillRect(0, 0, W, Hh);
    const r = rnd(5);
    g.fillStyle = 'rgba(120,100,60,0.08)'; for (let i = 0; i < 400; i++) g.fillRect(r() * W, r() * Hh, 2, 2);
    g.fillStyle = '#16120e'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = `700 92px 'Cormorant Garamond', Georgia, serif`; g.fillText(o.masthead ?? 'THE DAILY NEWS', W / 2, 105);
    g.fillRect(40, 128, W - 80, 6); g.fillRect(40, 176, W - 80, 2);
    g.font = `600 26px Georgia, serif`; g.fillText(o.date ?? 'NOVEMBER 1964', W / 2, 162);
    const lines = (o.headline ?? 'HEADLINE').split('\n');
    let fs = 118; g.font = `900 ${fs}px Montserrat, 'Arial Black', sans-serif`;
    const wm = Math.max(...lines.map((l) => g.measureText(l).width)); if (wm > W - 90) { fs = fs * (W - 90) / wm; g.font = `900 ${fs}px Montserrat, 'Arial Black', sans-serif`; }
    lines.forEach((l, i) => g.fillText(l, W / 2, 190 + fs * (i + 1) * 1.02));
    let y = 190 + fs * lines.length * 1.02 + 24;
    if (o.sub) { g.font = `italic 600 34px Georgia, serif`; g.fillText(o.sub, W / 2, y + 30); y += 56; }
    // photo: crate in a freight shed (halftone-ish)
    const px = 40, pw = 560, ph = Math.min(380, Hh - y - 60);
    g.fillStyle = '#4a4640'; g.fillRect(px, y, pw, ph);
    g.fillStyle = '#6a655c'; g.fillRect(px, y + ph * 0.62, pw, ph * 0.38);
    g.fillStyle = '#a58a62'; g.fillRect(px + pw * 0.2, y + ph * 0.3, pw * 0.55, ph * 0.45);
    g.strokeStyle = '#5a4630'; g.lineWidth = 5; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(px + pw * 0.2, y + ph * (0.3 + 0.1125 * k)); g.lineTo(px + pw * 0.75, y + ph * (0.3 + 0.1125 * k)); g.stroke(); }
    g.fillStyle = '#2a1c12'; g.font = `900 30px 'Courier New', monospace`; g.fillText(o.photo ?? 'C.O.D.', px + pw * 0.475, y + ph * 0.55);
    g.fillStyle = 'rgba(0,0,0,0.18)'; for (let yy = y; yy < y + ph; yy += 6) for (let xx = px; xx < px + pw; xx += 6) if (r() < 0.3) g.fillRect(xx, yy, 3, 3);
    // columns of text
    g.fillStyle = '#8a8478';
    const col = (x0: number, x1: number, y0: number, y1: number) => { for (let yy = y0; yy < y1; yy += 17) g.fillRect(x0, yy, (x1 - x0) * (0.75 + r() * 0.25), 7); };
    col(px + pw + 30, W - 40, y, y + ph);
    col(40, W / 2 - 20, y + ph + 30, Hh - 40); col(W / 2 + 20, W - 40, y + ph + 30, Hh - 40);
    return tex(c);
  }, [o.id]);
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(o.keys, 'rot', frame, [0, 0, 0]);
  const sc = sample<number>(o.keys, 'scale', frame, 1);
  if (sc <= 0.001) return null;
  return (
    <mesh position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={sc} castShadow receiveShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={t} roughness={0.9} side={THREE.DoubleSide} emissiveMap={t} emissive={'#ffffff'} emissiveIntensity={0.12} />
    </mesh>
  );
};

/** heat haze: faint additive shimmer sprites rising off hot tarmac over a box [w, h, d] above `center` */
export const Haze: React.FC<{ o: { id: string; center: number[]; box?: number[]; count?: number; opacity?: number; size?: number; color?: string } }> = ({ o }) => {
  const frame = useCurrentFrame();
  const n = o.count ?? 60; const [bw, bh, bd] = o.box ?? [30, 1.5, 30];
  const map = useMemo(() => {
    const [c, g] = mkCanvas(64, 128); const gr = g.createRadialGradient(32, 64, 0, 32, 64, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.save(); g.scale(1, 2); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.restore();
    return new THREE.CanvasTexture(c);
  }, []);
  const seeds = useMemo(() => { const r = rnd(29); return Array.from({ length: n }, () => [r(), r(), r(), r()]); }, [n]);
  const t = frame / 30;
  return (
    <group position={o.center as any}>
      {seeds.map(([a, b, d, e], i) => {
        const life = (t * (0.25 + e * 0.2) + b) % 1;
        const x = (a - 0.5) * bw + Math.sin(t * 2 + i) * 0.2, z = (d - 0.5) * bd;
        const s = (o.size ?? 2.2) * (0.6 + e);
        return <sprite key={i} position={[x, life * bh, z]} scale={[s, s * 0.35, 1]}><spriteMaterial map={map} color={o.color ?? '#fff3d8'} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={(o.opacity ?? 0.06) * Math.sin(Math.PI * life)} /></sprite>;
      })}
    </group>
  );
};

export const CARGO_TYPES = ['crate', 'airliner', 'newspaper', 'haze'];
export const CargoObject: React.FC<{ o: any }> = ({ o }) => {
  switch (o.type) {
    case 'crate': return <Crate o={o} />;
    case 'airliner': return <Airliner o={o} />;
    case 'newspaper': return <Newspaper o={o} />;
    case 'haze': return <Haze o={o} />;
    default: return null;
  }
};
