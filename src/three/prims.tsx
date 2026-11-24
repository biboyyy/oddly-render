// Primitive building blocks with toon material + inverted-hull outline.
// Authoring space is Blender's (Z-up); the whole world is rotated once.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { outlineMat, toon } from './toon';
import { V3 } from './math';

export type Kind = 'box' | 'sphere' | 'ico' | 'cyl' | 'cone' | 'torus' | 'plane';

const gcache = new Map<string, THREE.BufferGeometry>();
export const geo = (kind: Kind, a: { r2?: number; arc?: number; seg?: number; tube?: number; round?: number; detail?: number } = {}) => {
  const key = `${kind}|${JSON.stringify(a)}`;
  const hit = gcache.get(key);
  if (hit) return hit;
  let g: THREE.BufferGeometry;
  switch (kind) {
    case 'box':
      g = new RoundedBoxGeometry(2, 2, 2, 3, a.round ?? 0.18);
      break;
    case 'sphere':
      g = new THREE.SphereGeometry(1, a.seg ?? 28, Math.max(8, Math.round((a.seg ?? 28) * 0.6)));
      break;
    case 'ico':
      g = new THREE.IcosahedronGeometry(1, a.detail ?? 1);
      break;
    case 'cyl':
      g = new THREE.CylinderGeometry(a.r2 ?? 1, 1, 1, a.seg ?? 20, 1);
      g.rotateX(Math.PI / 2);
      break;
    case 'cone':
      g = new THREE.ConeGeometry(1, 1, a.seg ?? 20);
      g.rotateX(Math.PI / 2);
      break;
    case 'torus':
      g = new THREE.TorusGeometry(1, a.tube ?? 0.25, 10, a.seg ?? 32, a.arc ?? Math.PI * 2);
      break;
    case 'plane':
      g = new THREE.PlaneGeometry(2, 2);
      break;
  }
  gcache.set(key, g);
  return g;
};

/** Blender XYZ euler -> three Euler (Blender XYZ == three 'ZYX'). */
export const beul = (r?: V3) => new THREE.Euler(r?.[0] ?? 0, r?.[1] ?? 0, r?.[2] ?? 0, 'ZYX');

export type PrimProps = {
  kind: Kind;
  color?: string;
  mat?: THREE.Material;
  pos?: V3;
  scale?: V3 | number;
  rot?: V3;
  outline?: number | false;
  args?: Parameters<typeof geo>[1];
  shadow?: boolean;
  receive?: boolean;
  visible?: boolean;
  clip?: THREE.Plane[];
  children?: React.ReactNode;
};

export const Prim: React.FC<PrimProps> = ({ kind, color = '#ffffff', mat, pos, scale = 1, rot, outline = 0.012, args, shadow = true, receive = true, visible = true, clip, children }) => {
  const g = geo(kind, args);
  const m = mat ?? toon(color, clip ? { clip } : {});
  const s: V3 = typeof scale === 'number' ? [scale, scale, scale] : scale;
  const om = useMemo(() => (outline ? outlineMat(outline, undefined, clip) : null), [outline, clip]);
  return (
    <group position={pos} rotation={beul(rot)} scale={s} visible={visible}>
      <mesh geometry={g} material={m} castShadow={shadow} receiveShadow={receive} />
      {om && <mesh geometry={g} material={om} />}
      {children}
    </group>
  );
};

/** Plain group in Blender euler convention. */
export const G: React.FC<{ pos?: V3; rot?: V3; scale?: V3 | number; children?: React.ReactNode; visible?: boolean }> = ({ pos, rot, scale = 1, children, visible = true }) => (
  <group position={pos} rotation={beul(rot)} scale={typeof scale === 'number' ? [scale, scale, scale] : scale} visible={visible}>
    {children}
  </group>
);
