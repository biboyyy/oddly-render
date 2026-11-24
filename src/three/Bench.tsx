import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

const grad = () => {
  const t = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
};
export const Bench: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const g = useMemo(grad, []);
  const items = Array.from({ length: 120 }, (_, i) => i);
  return (
    <AbsoluteFill style={{ background: '#7FC8FF' }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 45, position: [0, 2, 9] }} shadows>
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
        {items.map((i) => (
          <mesh key={i} position={[((i % 10) - 4.5) * 0.9, Math.floor(i / 10) * 0.7 - 2.5, -2]} rotation={[f / 20, i, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.3, 32, 16]} />
            <meshToonMaterial color={i % 2 ? '#2865A5' : '#FFD447'} gradientMap={g} />
            <Outlines thickness={0.03} color="#101B32" />
          </mesh>
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshToonMaterial color="#E3C79F" gradientMap={g} />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
