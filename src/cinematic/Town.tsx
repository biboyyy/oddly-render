// ep024+ procedural Indonesian kampung ("gang") neighbourhood, fully instanced (cheap on the CPU renderer):
//   rows of 1–2 storey houses (gable / flat roofs, lit + dark windows, doors, awnings, water tanks, potted plants),
//   tree clumps, receding utility-pole lines with sagging wires, street strips + curbs + grass patches,
//   and a fog-free distant skyline silhouette (2 layers, lit windows, mosque dome + minaret, cell tower).
// All deterministic from `seed`. Coordinates: three.js Y up, metres.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Row = { z: number; face: 1 | -1; x0: number; x1: number; depth?: number; tall?: number };
type PoleLine = { pts: number[][]; h?: number; wires?: number; sag?: number; color?: string };
type Skyline = { z: number; x0: number; x1: number; hmin?: number; hmax?: number; color?: string; win?: string; mosque?: number[]; tower?: number[] };
export type TownSpec = {
  id: string; seed?: number; rows?: Row[]; gaps?: number[][]; // gaps: [x0,x1] ranges kept free (cross streets)
  poles?: PoleLine[]; skyline?: Skyline[]; trees?: { x0: number; x1: number; z0: number; z1: number; n: number }[];
  streets?: { x0: number; x1: number; z: number; w: number; along?: 'x' | 'z' }[]; grass?: { x0: number; x1: number; z0: number; z1: number; n: number }[];
  lit?: number;
};

const WALL = ['#e8d6b8', '#cfdac6', '#efc7a0', '#c4d2e2', '#f0e2bf', '#d9b496', '#e2c9d0', '#b8d4c8', '#f2d27a', '#9fc2a8'];
const ROOF = ['#9a3f2c', '#7e4a36', '#8a2f26', '#5f5048', '#a8603c', '#6b3a2e', '#46607a'];
const WIN_ON = ['#ffc56e', '#ffd99a', '#ffb45e', '#ffe2b0', '#9fd0ff'];

type It = { p: number[]; s: number[]; r?: number[]; c?: string };
const Inst: React.FC<{ geo: THREE.BufferGeometry; mat: THREE.Material; items: It[]; cast?: boolean; recv?: boolean }> = ({ geo, mat, items, cast, recv }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
    const d = new THREE.Object3D(); const col = new THREE.Color();
    items.forEach((it, i) => {
      d.position.set(it.p[0], it.p[1], it.p[2]); d.rotation.set(...((it.r ?? [0, 0, 0]) as [number, number, number])); d.scale.set(it.s[0], it.s[1], it.s[2]);
      d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, col.set(it.c ?? '#ffffff'));
    });
    m.count = items.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = !!cast; m.receiveShadow = !!recv; m.frustumCulled = false;
    return m;
  }, [items]);
  return items.length ? <primitive object={mesh} /> : null;
};

const gable = (() => { // unit triangular prism, ridge along X, base y=0..1, z -0.5..0.5
  const sh = new THREE.Shape(); sh.moveTo(-0.5, 0); sh.lineTo(0.5, 0); sh.lineTo(0, 1); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); g.rotateY(Math.PI / 2); g.computeVertexNormals(); return g;
})();

export const Town: React.FC<{ o: TownSpec }> = ({ o }) => {
  const B = useMemo(() => {
    let s = (o.seed ?? 7) * 7919 + 13; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const free = (x: number, w: number) => !(o.gaps ?? []).some(([a, b]) => x + w / 2 > a && x - w / 2 < b);
    const body: It[] = [], roofG: It[] = [], roofF: It[] = [], win: It[] = [], door: It[] = [], awn: It[] = [], tank: It[] = [], plant: It[] = [], base: It[] = [];
    for (const row of o.rows ?? []) {
      const fz = row.face;
      for (let x = row.x0; x < row.x1;) {
        const w = 3.4 + r() * 2.8; const cx = x + w / 2; x += w + (r() < 0.25 ? 0.6 + r() * 1.2 : 0.06);
        if (!free(cx, w)) continue;
        const two = r() < (row.tall ?? 0.4); const h = two ? 5.4 + r() * 1.2 : 3.0 + r() * 0.7; const d = (row.depth ?? 6) * (0.85 + r() * 0.3);
        const cz = row.z - fz * d / 2, front = row.z + fz * 0.03;
        body.push({ p: [cx, h / 2, cz], s: [w, h, d], c: pick(WALL) });
        base.push({ p: [cx, 0.3, front + fz * 0.02], s: [w, 0.6, 0.06], c: '#6d6660' });
        const rc = pick(ROOF);
        if (r() < 0.78) roofG.push({ p: [cx, h, cz], s: [w + 0.5, 1.1 + r() * 0.6, d + 0.7], c: rc });
        else { roofF.push({ p: [cx, h + 0.12, cz], s: [w + 0.15, 0.24, d + 0.15], c: '#9a948c' }); if (r() < 0.8) tank.push({ p: [cx + (r() - 0.5) * w * 0.5, h + 0.75, cz], s: [0.5, 1.0, 0.5], c: r() < 0.5 ? '#2f6fc0' : '#d8d2c4' }); }
        const dx = cx + (r() - 0.5) * w * 0.5; door.push({ p: [dx, 1.05, front + fz * 0.03], s: [0.95, 2.05, 0.06], c: pick(['#5a3b26', '#3f4a5a', '#6a2f2a', '#2f4a3a']) });
        if (r() < 0.55) awn.push({ p: [dx, 2.45, front + fz * 0.45], s: [1.6, 0.08, 0.95], r: [fz * 0.25, 0, 0], c: pick(['#3d7f9a', '#b54a3a', '#d9a23a', '#4f8a4a', '#8a8a90']) });
        const nW = Math.max(1, Math.floor((w - 1.4) / 1.4));
        for (let k = 0; k < nW; k++) {
          const wx = cx - w / 2 + 0.9 + k * ((w - 1.8) / Math.max(1, nW - 1 || 1));
          if (Math.abs(wx - dx) < 0.9) continue;
          const on = r() < 0.62; win.push({ p: [wx, 1.6, front + fz * 0.04], s: [0.85, 0.95, 1], r: [0, fz > 0 ? 0 : Math.PI, 0], c: on ? pick(WIN_ON) : '#27303d' });
        }
        if (two) for (let k = 0; k < Math.max(1, nW); k++) {
          const wx = cx - w / 2 + 0.9 + k * ((w - 1.8) / Math.max(1, nW - 1 || 1)); const on = r() < 0.5;
          win.push({ p: [wx, 4.2, front + fz * 0.04], s: [0.85, 0.95, 1], r: [0, fz > 0 ? 0 : Math.PI, 0], c: on ? pick(WIN_ON) : '#27303d' });
        }
        if (r() < 0.5) plant.push({ p: [dx + (r() < 0.5 ? -0.8 : 0.8), 0.45, front + fz * 0.4], s: [0.55, 0.6, 0.55], c: pick(['#3f7a34', '#4f8a3a', '#2f6a30']) });
      }
    }
    // trees
    const tree: It[] = [], trunk: It[] = [];
    for (const t of o.trees ?? []) for (let k = 0; k < t.n; k++) {
      const x = t.x0 + r() * (t.x1 - t.x0), z = t.z0 + r() * (t.z1 - t.z0), h = 4 + r() * 4, sz = 2 + r() * 2.2;
      trunk.push({ p: [x, h / 2, z], s: [0.25, h, 0.25], c: '#4a3626' });
      for (let j = 0; j < 3; j++) tree.push({ p: [x + (r() - 0.5) * sz * 0.6, h + (r() - 0.3) * sz * 0.5, z + (r() - 0.5) * sz * 0.6], s: [sz * (0.6 + r() * 0.3), sz * (0.5 + r() * 0.3), sz * (0.6 + r() * 0.3)], c: pick(['#2f5a2c', '#3a6a30', '#284e2a', '#476f34']) });
    }
    // streets, curbs, grass
    const road: It[] = [], curb: It[] = [], grass: It[] = [];
    for (const st of o.streets ?? []) {
      const len = st.x1 - st.x0, mx = (st.x0 + st.x1) / 2;
      if ((st.along ?? 'x') === 'x') {
        road.push({ p: [mx, 0.012, st.z], s: [len, 0.02, st.w], c: '#3a3537' });
        for (const sd of [-1, 1]) { curb.push({ p: [mx, 0.06, st.z + sd * (st.w / 2 + 0.12)], s: [len, 0.12, 0.24], c: '#a8a198' }); curb.push({ p: [mx, 0.02, st.z + sd * (st.w / 2 + 0.55)], s: [len, 0.03, 0.6], c: '#25282c' }); }
        for (let x = st.x0 + 2; x < st.x1; x += 6) road.push({ p: [x, 0.024, st.z], s: [2.2, 0.01, 0.12], c: '#d8d0b0' });
      } else {
        road.push({ p: [st.z, 0.012, mx], s: [st.w, 0.02, len], c: '#3a3537' });
        for (const sd of [-1, 1]) curb.push({ p: [st.z + sd * (st.w / 2 + 0.12), 0.06, mx], s: [0.24, 0.12, len], c: '#a8a198' });
      }
    }
    for (const g of o.grass ?? []) for (let k = 0; k < g.n; k++) {
      grass.push({ p: [g.x0 + r() * (g.x1 - g.x0), 0.03 + r() * 0.01, g.z0 + r() * (g.z1 - g.z0)], s: [0.6 + r() * 1.6, 0.06 + r() * 0.1, 0.4 + r() * 0.9], r: [0, r() * 3, 0], c: pick(['#4d6b30', '#5a7a36', '#41602c', '#66843c']) });
    }
    // utility poles + wires
    const pole: It[] = [], arm: It[] = [], ins: It[] = [];
    const wireGeos: THREE.BufferGeometry[] = [];
    for (const pl of o.poles ?? []) {
      const H = pl.h ?? 8.5, nw = pl.wires ?? 3, sag = pl.sag ?? 0.45;
      const P = pl.pts.map((q) => new THREE.Vector3(q[0], 0, q[1]));
      P.forEach((p, i) => {
        const nb = P[Math.min(P.length - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]); const yaw = Math.atan2(nb.x, nb.z);
        pole.push({ p: [p.x, H / 2, p.z], s: [1, H, 1], c: '#9a968e' });
        arm.push({ p: [p.x, H - 0.45, p.z], s: [1.6, 0.1, 0.1], r: [0, yaw, 0], c: '#55585e' });
        for (let k = 0; k < nw; k++) { const off = (k - (nw - 1) / 2) * 0.62; ins.push({ p: [p.x + Math.cos(yaw) * off, H - 0.33, p.z - Math.sin(yaw) * off], s: [1, 1, 1], c: '#e9e4d8' }); }
      });
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1]; const dir = b.clone().sub(a); const yaw = Math.atan2(dir.x, dir.z);
        for (let k = 0; k < nw; k++) {
          const off = (k - (nw - 1) / 2) * 0.62; const o3 = new THREE.Vector3(Math.cos(yaw) * off, 0, -Math.sin(yaw) * off);
          const pts = Array.from({ length: 13 }, (_, j) => { const u = j / 12; return a.clone().lerp(b, u).add(o3).setY(H - 0.27 - sag * 4 * u * (1 - u)); });
          wireGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.018, 4, false));
        }
      }
    }
    const wires = wireGeos.length ? mergeGeometries(wireGeos) : null;
    // skyline (fog-free silhouettes)
    const sky: It[] = [], skyWin: It[] = [], dome: It[] = [];
    for (const L of o.skyline ?? []) {
      for (let x = L.x0; x < L.x1;) {
        const w = 8 + r() * 22, h = (L.hmin ?? 8) + Math.pow(r(), 1.8) * ((L.hmax ?? 60) - (L.hmin ?? 8));
        sky.push({ p: [x + w / 2, h / 2, L.z], s: [w, h, 10], c: L.color ?? '#3e2c50' });
        if (L.win) for (let k = 0; k < Math.floor(h * w / 70); k++) if (r() < 0.22) skyWin.push({ p: [x + 1.5 + r() * (w - 3), 2 + r() * (h - 4), L.z + 5.05], s: [0.9, 1.3, 1], c: r() < 0.8 ? L.win : '#bfe0ff' });
        x += w + r() * 6;
      }
      if (L.mosque) { const [mx, ms] = L.mosque; dome.push({ p: [mx, 12 * ms, L.z - 2], s: [12 * ms, 12 * ms, 12 * ms], c: L.color ?? '#3e2c50' }); sky.push({ p: [mx, 6 * ms, L.z - 2], s: [16 * ms, 12 * ms, 16 * ms], c: L.color ?? '#3e2c50' }); sky.push({ p: [mx + 13 * ms, 16 * ms, L.z - 2], s: [2 * ms, 32 * ms, 2 * ms], c: L.color ?? '#3e2c50' }); dome.push({ p: [mx + 13 * ms, 32.5 * ms, L.z - 2], s: [3 * ms, 3.6 * ms, 3 * ms], c: L.color ?? '#3e2c50' }); }
      if (L.tower) { const [tx, th] = L.tower; sky.push({ p: [tx, th / 2, L.z + 3], s: [1.2, th, 1.2], c: L.color ?? '#3e2c50' }); skyWin.push({ p: [tx, th + 0.6, L.z + 3.7], s: [1.4, 1.4, 1], c: '#ff4a3a' }); }
    }
    return { body, roofG, roofF, win, door, awn, tank, plant, base, tree, trunk, road, curb, grass, pole, arm, ins, wires, sky, skyWin, dome };
  }, [o.id]);
  const M = useMemo(() => {
    const std = (rough = 0.9) => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: rough, metalness: 0, flatShading: false });
    return {
      wall: std(0.95), roof: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, flatShading: true }), basic: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      std: std(0.85), leaf: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }),
      sky: new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), skyWin: new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, toneMapped: false }),
      wire: new THREE.MeshStandardMaterial({ color: '#1d1f24', roughness: 0.5, metalness: 0.5 }),
    };
  }, [o.id]);
  const G = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1), plane: new THREE.PlaneGeometry(1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
    pole: new THREE.CylinderGeometry(0.09, 0.13, 1, 10), ins: new THREE.CylinderGeometry(0.05, 0.06, 0.16, 8), ball: new THREE.IcosahedronGeometry(0.5, 1), sph: new THREE.SphereGeometry(0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  }), []);
  // lit windows: brightness factor via instance colour multiply
  return (
    <group>
      <Inst geo={G.box} mat={M.wall} items={B.body} cast recv />
      <Inst geo={gable} mat={M.roof} items={B.roofG} cast recv />
      <Inst geo={G.box} mat={M.std} items={[...B.roofF, ...B.base, ...B.door, ...B.awn]} cast recv />
      <Inst geo={G.plane} mat={M.basic} items={B.win} />
      <Inst geo={G.cyl} mat={M.std} items={B.tank} cast />
      <Inst geo={G.ball} mat={M.leaf} items={[...B.plant, ...B.tree]} cast recv />
      <Inst geo={G.box} mat={M.std} items={B.trunk} cast />
      <Inst geo={G.box} mat={M.std} items={[...B.road, ...B.curb]} recv />
      <Inst geo={G.ball} mat={M.leaf} items={B.grass} recv />
      <Inst geo={G.pole} mat={M.std} items={B.pole} cast />
      <Inst geo={G.box} mat={M.std} items={B.arm} cast />
      <Inst geo={G.ins} mat={M.std} items={B.ins} />
      {B.wires && <mesh geometry={B.wires} material={M.wire} />}
      <Inst geo={G.box} mat={M.sky} items={B.sky} />
      <Inst geo={G.sph} mat={M.sky} items={B.dome} />
      <Inst geo={G.plane} mat={M.skyWin} items={B.skyWin} />
    </group>
  );
};
