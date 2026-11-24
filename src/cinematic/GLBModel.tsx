import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { DEG, Key, sample } from './tracks';

export type ClipCue = { name: string; at: number; until?: number; speed?: number; loop?: boolean; fade?: number; offset?: number };
export type GLBSpec = {
  id: string; src: string;
  fit?: { height?: number; size?: number; ground?: boolean };
  scale?: number;
  keys?: Key[]; // pos [x,y,z], rot [deg x,y,z], scale (multiplier), visible (0/1)
  clips?: ClipCue[];
  shadow?: boolean;
  envIntensity?: number;
  tint?: string; // optional colour multiplier for flat-coloured assets
  // props parented to a skeleton bone (e.g. cigarette in 'Bip01 R Finger2'); size/offset in world metres,
  // offset/rot in the bone's local axes. emissive props glow (cigarette tip, phone screen).
  attach?: Array<{ bone: string; shape?: 'box' | 'cylinder' | 'sphere'; size: number[]; offset?: number[]; rot?: number[];
                   color?: string; emissive?: string; emissiveIntensity?: number; opacity?: number; from?: number; until?: number }>;
  // CCD IK overlay on top of mocap: pull `effector` bone to `target` bone + offset (model space: +Z forward, +Y up, metres).
  // weight keys [{at, w}] ramp the IK in/out; chain = joints to rotate (child-first).
  ik?: Array<{ chain: string[]; effector: string; target: string; offset?: number[]; keys: Key[]; iters?: number }>;
};

/** A real GLB/GLTF asset: auto-fit scale, keyframed transform, and
 *  frame-accurate animation clips (blended with linear cross-fades). */
export const GLBModel: React.FC<{ spec: GLBSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gltf = useGLTF(staticFile(spec.src)) as unknown as { scene: THREE.Object3D; animations: THREE.AnimationClip[] };
  const { root, base, mixer, actions, attached } = useMemo(() => {
    const root = skeletonClone(gltf.scene);
    root.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = spec.shadow !== false;
        o.receiveShadow = true;
        o.frustumCulled = false;
        if (o.material) {
          o.material = o.material.clone();
          if (spec.envIntensity !== undefined) o.material.envMapIntensity = spec.envIntensity;
          if (spec.tint) o.material.color?.multiply(new THREE.Color(spec.tint));
        }
      }
    });
    // auto-fit
    // precise=true: skinned meshes (rigged humans) are measured with bone transforms applied;
    // the default bbox of a SkinnedMesh under a cm-scaled armature is wildly off (avatar vanished).
    root.updateMatrixWorld(true);
    let hasSkin = false;
    root.traverse((o: any) => { if (o.isSkinnedMesh) hasSkin = true; });
    const box = new THREE.Box3().setFromObject(root, hasSkin);
    const size = box.getSize(new THREE.Vector3());
    let s = spec.scale ?? 1;
    if (spec.fit?.height) s = spec.fit.height / Math.max(1e-6, size.y);
    else if (spec.fit?.size) s = spec.fit.size / Math.max(1e-6, size.x, size.y, size.z);
    const center = box.getCenter(new THREE.Vector3());
    const offset = new THREE.Vector3(-center.x, spec.fit?.ground === false ? -center.y : -box.min.y, -center.z).multiplyScalar(s);
    const mixer = new THREE.AnimationMixer(root);
    const actions: Record<string, THREE.AnimationAction> = {};
    for (const c of gltf.animations) {
      const a = mixer.clipAction(c);
      a.play();
      a.setEffectiveWeight(0);
      actions[c.name] = a;
    }
    // bone-parented props
    const attached: THREE.Object3D[] = [];
    root.updateMatrixWorld(true);
    for (const at of spec.attach ?? []) {
      let bone: THREE.Object3D | undefined;
      root.traverse((o) => { if (!bone && o.name.replace(/_/g, ' ') === at.bone) bone = o; });
      if (!bone) { console.warn(`[GLBModel] bone not found: ${at.bone}`); continue; }
      const ws = new THREE.Vector3(); bone.getWorldScale(ws);
      const k = 1 / (s * ws.x);
      const [sx, sy, sz] = at.size;
      const geo = at.shape === 'sphere' ? new THREE.SphereGeometry(0.5, 16, 12)
        : at.shape === 'cylinder' ? new THREE.CylinderGeometry(0.5, 0.5, 1, 12) : new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: at.color ?? '#ffffff', roughness: 0.6,
        emissive: new THREE.Color(at.emissive ?? '#000000'), emissiveIntensity: at.emissiveIntensity ?? (at.emissive ? 2 : 0),
        transparent: (at.opacity ?? 1) < 1, opacity: at.opacity ?? 1 });
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(sx * k, sy * k, sz * k);
      const off = at.offset ?? [0, 0, 0];
      m.position.set(off[0] * k, off[1] * k, off[2] * k);
      const r = at.rot ?? [0, 0, 0];
      m.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG);
      m.castShadow = false; m.frustumCulled = false;
      (m as any).userData.win = [at.from ?? -1e9, at.until ?? 1e9];
      bone.add(m); attached.push(m);
    }
    return { root, base: { s, offset }, mixer, actions, attached };
  }, [gltf, spec.src, spec.fit?.height, spec.fit?.size, spec.scale, JSON.stringify(spec.attach ?? [])]);

  // --- animation clips: per-frame weights + times (deterministic, seek-safe)
  const t = frame / fps;
  const weights: Record<string, { w: number; time: number }> = {};
  for (const c of spec.clips ?? []) {
    const a = actions[c.name];
    if (!a) continue;
    const start = c.at / fps, end = (c.until ?? 1e9) / fps, fade = c.fade ?? 0.25;
    if (t < start - 1e-6 || t > end + fade) continue;
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const fin = c.at <= 0 || fade <= 0 ? 1 : clamp01((t - start) / fade);
    const fout = fade <= 0 ? (t <= end ? 1 : 0) : clamp01(1 - (t - end) / fade);
    const w = fin * fout;
    const dur = a.getClip().duration;
    let lt = (t - start) * (c.speed ?? 1) + (c.offset ?? 0);
    lt = c.loop === false ? Math.min(lt, dur - 1e-3) : ((lt % dur) + dur) % dur;
    const prev = weights[c.name];
    if (!prev || w > prev.w) weights[c.name] = { w: Math.max(0, Math.min(1, w)), time: lt };
  }
  const total = Object.values(weights).reduce((s, x) => s + x.w, 0);
  for (const [name, a] of Object.entries(actions)) {
    const x = weights[name];
    a.enabled = !!x;
    a.setEffectiveWeight(x ? x.w / Math.max(1, total) : 0);
    if (x) a.time = x.time;
  }
  mixer.update(0);
  for (const m of attached) { const [a, b] = (m as any).userData.win; m.visible = frame >= a && frame < b; } // from/until resolved to frames by compose

  // --- IK overlay (after mocap pose)
  if (spec.ik?.length) {
    const find = (n: string) => { let b: THREE.Object3D | undefined; root.traverse((o) => { if (!b && o.name.replace(/_/g, ' ') === n) b = o; }); return b; };
    root.updateMatrixWorld(true);
    for (const ik of spec.ik) {
      const w = Math.max(0, Math.min(1, sample<number>(ik.keys, 'w', frame, 0)));
      if (w <= 1e-3) continue;
      const eff = find(ik.effector), tgt = find(ik.target);
      const joints = ik.chain.map(find).filter(Boolean) as THREE.Object3D[];
      if (!eff || !tgt || !joints.length) continue;
      const rq = new THREE.Quaternion(); root.getWorldQuaternion(rq);
      const rs = new THREE.Vector3(); root.getWorldScale(rs);
      const off = new THREE.Vector3(...((ik.offset ?? [0, 0, 0]) as [number, number, number])).multiply(rs).applyQuaternion(rq);
      const goal = tgt.getWorldPosition(new THREE.Vector3()).add(off);
      // blend goal from the mocap effector position so weight ramps move the hand smoothly
      const e0 = eff.getWorldPosition(new THREE.Vector3());
      goal.lerpVectors(e0, goal, w * w * (3 - 2 * w));
      for (let it = 0; it < (ik.iters ?? 12); it++) {
        for (const j of joints) {
          const jp = j.getWorldPosition(new THREE.Vector3());
          const e = eff.getWorldPosition(new THREE.Vector3());
          const a = e.sub(jp).normalize(), b = goal.clone().sub(jp).normalize();
          const dq = new THREE.Quaternion().setFromUnitVectors(a, b);
          const jw = j.getWorldQuaternion(new THREE.Quaternion());
          const pw = j.parent ? j.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
          j.quaternion.copy(pw.invert().multiply(dq.multiply(jw)));
          j.updateMatrixWorld(true);
        }
      }
    }
  }

  const pos = sample<number[]>(spec.keys, 'pos', frame, [0, 0, 0]);
  const rot = sample<number[]>(spec.keys, 'rot', frame, [0, 0, 0]);
  const sc = sample<number>(spec.keys, 'scale', frame, 1);
  const vis = sample<number>(spec.keys, 'visible', frame, 1);
  return (
    <group position={pos as any} rotation={[rot[0] * DEG, rot[1] * DEG, rot[2] * DEG]} scale={sc} visible={vis > 0.5 && sc > 1e-3}>
      <group position={base.offset} scale={base.s}>
        <primitive object={root} />
      </group>
    </group>
  );
};
