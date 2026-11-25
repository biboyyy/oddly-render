import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Prim, G } from './prims';
import { outlineMat, toon, PAL } from './toon';
import { CharPose, fk, HIP_Z, L2, Look } from './rig';
import { Brain, BrainGeo, buildBrain } from './anatomy';
import { V3 } from './math';

const N: React.FC<{ m: THREE.Matrix4; children?: React.ReactNode }> = ({ m, children }) => (
  <group matrixAutoUpdate={false} matrix={m}>
    {children}
  </group>
);

const RX = 0.21, RY = 0.2, RZ = 0.227;
const faceY = (x: number, z: number, inset = 0.0) => {
  const dz = (z - 0.21) / RZ;
  const dx = x / RX;
  return -RY * Math.sqrt(Math.max(0, 1 - dx * dx - dz * dz)) - inset;
};

type Mats = { skin: THREE.MeshToonMaterial; skinBody: THREE.MeshToonMaterial; hair: THREE.MeshToonMaterial; face: THREE.MeshToonMaterial; mouth: THREE.MeshToonMaterial; top: string; topDark: string; legs: string };

const Hair: React.FC<{ look: Look; m: Mats }> = ({ look, m }) => {
  if (look.hairStyle === 'hijab') {
    return (
      <>
        <Prim kind="sphere" mat={m.hair} pos={[0, 0.07, 0.245]} scale={[0.25, 0.24, 0.255]} outline={0.008} />
        <group position={[0, -0.13, 0.21]} rotation={[Math.PI / 2, 0, 0]}>
          <Prim kind="torus" mat={m.hair} scale={[0.19, 0.24, 0.12]} args={{ tube: 0.12, seg: 32 }} outline={0.006} />
        </group>
      </>
    );
  }
  if (look.hairStyle === 'cap') {
    return (
      <>
        <Prim kind="sphere" mat={toon('#2E8F89')} pos={[0, 0.015, 0.29]} scale={[0.228, 0.228, 0.16]} />
        <Prim kind="torus" mat={toon('#2E8F89')} pos={[0, 0.012, 0.27]} scale={[0.215, 0.215, 0.2]} args={{ tube: 0.08 }} outline={0.006} />
      </>
    );
  }
  const spikes: Array<[number, number, number, number]> = look.hairStyle === 'spiky'
    ? [[-0.14, 0.37, 0.55, 0], [-0.07, 0.395, 0.25, 0.25], [0, 0.405, -0.05, 0.3], [0.075, 0.395, -0.3, 0.25], [0.14, 0.37, -0.55, 0.05], [-0.09, 0.445, 0.3, -0.5], [0.03, 0.46, -0.1, -0.6], [0.12, 0.435, -0.4, -0.5]]
    : [];
  return (
    <>
      <Prim kind="sphere" mat={m.hair} pos={[0, 0.03, 0.262]} scale={[0.224, 0.217, 0.207]} outline={0.008} />
      <Prim kind="sphere" mat={m.hair} pos={[0, 0.07, 0.19]} scale={[0.207, 0.162, 0.172]} outline={0.008} />
      {[-1, 1].map((sx) => (
        <Prim key={sx} kind="box" mat={m.hair} pos={[sx * 0.2, -0.04, 0.24]} scale={[0.018, 0.04, 0.05]} outline={0.005} />
      ))}
      {spikes.map(([x, z, rz, rx], i) => (
        <Prim key={i} kind="cone" mat={m.hair} pos={[x, rx >= 0 ? -0.12 : 0.02, z]} scale={[0.06, 0.05, 0.13]} rot={[(110 * Math.PI) / 180 + rx, 0, rz]} args={{ seg: 6 }} outline={0.008} />
      ))}
      {look.hairStyle === 'bob' && (
        <>
          {[-1, 1].map((sx) => <Prim key={`bob${sx}`} kind="sphere" mat={m.hair} pos={[sx * 0.2, 0.03, 0.17]} scale={[0.07, 0.17, 0.2]} outline={0.008} />)}
          <Prim kind="sphere" mat={m.hair} pos={[0, 0.11, 0.15]} scale={[0.21, 0.12, 0.2]} outline={0.008} />
        </>
      )}
      {look.hairStyle === 'side' ? (
        <>
          <Prim kind="sphere" mat={m.hair} pos={[0.06, -0.11, 0.37]} scale={[0.18, 0.095, 0.07]} rot={[0.4, 0, -0.35]} outline={0.008} />
          <Prim kind="cone" mat={m.hair} pos={[0.17, -0.12, 0.31]} scale={[0.05, 0.04, 0.12]} rot={[2.6, 0, -0.6]} args={{ seg: 6 }} outline={0.006} />
        </>
      ) : (
        <Prim kind="sphere" mat={m.hair} pos={[0.02, -0.115, 0.37]} scale={look.hairStyle === 'spiky' ? [0.17, 0.09, 0.06] : [0.19, 0.1, 0.07]} rot={[0.35, 0, -0.12]} outline={0.008} />
      )}
    </>
  );
};

/** Anime-style eye: dark iris + 2 highlights + lid line. */
const Eye: React.FC<{ side: 1 | -1; m: Mats; pose: CharPose }> = ({ side, m, pose }) => {
  const ex = side * 0.078, ez = 0.215;
  const [ox, oz] = pose.face.eyeOff;
  return (
    <group position={[ex + ox, faceY(ex, ez), ez + oz]} scale={[1, 1, Math.max(0.06, pose.face.eyes)]}>
      <Prim kind="sphere" mat={m.face} scale={[0.032, 0.012, 0.046]} outline={false} />
      <Prim kind="sphere" mat={toon('#2865A5')} pos={[0, -0.006, -0.014]} scale={[0.022, 0.008, 0.02]} outline={false} />
      <Prim kind="sphere" mat={toon('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 1 })} pos={[side * 0.01, -0.012, 0.016]} scale={[0.01, 0.004, 0.011]} outline={false} shadow={false} />
      <Prim kind="sphere" mat={toon('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 1 })} pos={[-side * 0.008, -0.012, -0.018]} scale={[0.005, 0.003, 0.005]} outline={false} shadow={false} />
    </group>
  );
};

export const Character: React.FC<{ id: string; look: Look; pose: CharPose; brain?: boolean }> = ({ id, look, pose, brain }) => {
  const local = useMemo(() => fk(pose), [pose]);
  const m: Mats = useMemo(() => ({
    skin: toon(look.skin, { unique: `${id}_skin` }),
    skinBody: toon(look.skin),
    hair: toon(look.hair, { unique: `${id}_hair` }),
    face: toon('#141824', { unique: `${id}_face` }),
    mouth: toon('#3A1F27', { unique: `${id}_mouth` }),
    top: look.top ?? { hoodie: PAL.blue, gown: '#BFE3FF', scrubs: '#3FA7A0', labcoat: '#F8FAFF', tee: '#6E8B74', suit: '#F2F4F8' }[look.outfit],
    topDark: look.topDark ?? { hoodie: '#1D4C80', gown: '#8CC6EE', scrubs: '#2B7F7A', labcoat: '#D7E3F2', tee: '#4F6A56', suit: '#C9D3E0' }[look.outfit],
    legs: look.legs ?? { hoodie: '#25324F', gown: '#BFE3FF', scrubs: '#2B7F7A', labcoat: '#25324F', tee: '#3B4660', suit: '#E8ECF2' }[look.outfit],
  }), [id, look]);
  const brainGeo: BrainGeo | null = useMemo(() => (brain ? buildBrain(3) : null), [brain]);

  // x-ray: glassy head
  const x = pose.xray;
  m.skin.opacity = 1 - 0.66 * x;
  m.skin.transparent = x > 0.001;
  m.skin.depthWrite = x < 0.5;
  m.skin.emissive.set('#7FC8FF');
  m.skin.emissiveIntensity = 0.45 * x;
  m.hair.opacity = 1 - 0.88 * x;
  m.hair.transparent = x > 0.001;
  m.hair.depthWrite = x < 0.5;
  m.face.opacity = 1 - 0.75 * x;
  m.face.transparent = x > 0.001;
  m.mouth.opacity = 1 - 0.8 * x;
  m.mouth.transparent = x > 0.001;
  const headOutline = x > 0.5 ? outlineMat(0.006, '#2865A5') : outlineMat(0.01);
  // grandpa costume: hair goes white, beard + moustache grow in
  const el = pose.elder;
  m.hair.color.set(look.hair).lerp(new THREE.Color('#F2F2F2'), el);
  const beard = toon('#F5F5F5');

  const f = pose.face;
  const smile = Math.max(0.0001, f.smile);
  const open = Math.max(0.0001, f.open);
  const mz = 0.115;
  const legsMat = toon(m.legs);
  const topMat = toon(m.top);
  return (
    <N m={local.root}>
      <N m={local.hips}>
        <Prim kind="box" mat={legsMat} pos={[0, 0, 0]} scale={[0.18, 0.11, 0.07]} />
        <N m={local.spine}>
          <N m={local.breath}>
            {/* torso: tapered rounded box */}
            <Prim kind="box" mat={topMat} pos={[0, 0, 0.235]} scale={[0.205, 0.118, 0.27]} args={{ round: 0.12 }} />
            <Prim kind="box" mat={topMat} pos={[0, 0, 0.42]} scale={[0.225, 0.12, 0.09]} args={{ round: 0.08 }} />
            {look.outfit === 'hoodie' && (
              <>
                <Prim kind="box" color="#FFFFFF" pos={[0, -0.118, 0.33]} scale={[0.045, 0.006, 0.16]} outline={0.004} />
                {[-1, 1].map((sx) => (
                  <Prim key={sx} kind="cyl" color={PAL.yellow} pos={[sx * 0.03, -0.124, 0.36]} scale={[0.008, 0.008, 0.13]} outline={0.003} />
                ))}
                <Prim kind="box" color={m.topDark} pos={[0, -0.122, 0.08]} scale={[0.13, 0.008, 0.055]} outline={0.004} />
                <Prim kind="box" color={PAL.yellow} pos={[0.12, -0.124, 0.4]} scale={[0.028, 0.005, 0.028]} outline={0.004} />
              </>
            )}
            {look.outfit === 'scrubs' && <Prim kind="box" color={m.topDark} pos={[0.1, -0.122, 0.33]} scale={[0.05, 0.006, 0.04]} outline={0.004} />}
            {look.outfit === 'labcoat' && (
              <>
                {/* blue shirt + tie in the open coat, lapels, pocket, pen, badge */}
                <Prim kind="box" color="#BFE3FF" pos={[0, -0.119, 0.36]} scale={[0.06, 0.006, 0.14]} outline={0.004} />
                <Prim kind="box" color={PAL.navy} pos={[0, -0.124, 0.33]} scale={[0.016, 0.005, 0.11]} outline={false} />
                {[-1, 1].map((sx) => <Prim key={sx} kind="box" color="#E4ECF7" pos={[sx * 0.075, -0.123, 0.38]} scale={[0.03, 0.006, 0.1]} rot={[0, sx * -0.35, 0]} outline={0.004} />)}
                <Prim kind="box" color="#E4ECF7" pos={[0.12, -0.122, 0.22]} scale={[0.05, 0.005, 0.045]} outline={0.004} />
                <Prim kind="box" color={PAL.yellow} pos={[0.105, -0.126, 0.27]} scale={[0.008, 0.004, 0.03]} outline={0.003} />
                <Prim kind="box" color={PAL.blue} pos={[-0.12, -0.124, 0.38]} scale={[0.035, 0.004, 0.018]} outline={0.003} />
                {/* coat skirt below the waist */}
                <Prim kind="box" color={m.top} pos={[0, 0.0, -0.1]} scale={[0.215, 0.13, 0.13]} args={{ round: 0.06 }} />
                {/* stethoscope */}
                <Prim kind="torus" color="#2B3F66" pos={[0, -0.02, 0.48]} scale={[0.12, 0.13, 0.2]} rot={[0.25, 0, 0]} args={{ tube: 0.09, seg: 24, arc: Math.PI * 1.3 }} outline={false} />
                <Prim kind="cyl" color="#C9D3E0" pos={[0.06, -0.13, 0.27]} scale={[0.025, 0.025, 0.012]} rot={[Math.PI / 2, 0, 0]} outline={0.004} />
              </>
            )}
            {look.outfit === 'tee' && look.hairStyle !== 'hijab' && <Prim kind="box" color={m.topDark} pos={[0, -0.118, 0.47]} scale={[0.07, 0.006, 0.02]} outline={0.003} />}
            {look.hairStyle === 'hijab' && (
              <>
                {/* khimar: soft cape over the shoulders + rounded front panel to mid-chest + back panel (replaces the old neck cone that poked through the shirt) */}
                <Prim kind="sphere" mat={m.hair} pos={[0, 0.0, 0.465]} scale={[0.27, 0.16, 0.115]} args={{ seg: 32 }} outline={0.007} />
                <Prim kind="sphere" mat={m.hair} pos={[0, -0.118, 0.39]} scale={[0.175, 0.04, 0.13]} args={{ seg: 32 }} outline={0.006} />
                <Prim kind="sphere" mat={m.hair} pos={[0, 0.118, 0.39]} scale={[0.185, 0.04, 0.13]} args={{ seg: 32 }} outline={0.006} />
              </>
            )}
            {look.kurta && (
              <>
                {/* EP022 kurta: long shirt skirt below the waist + button placket */}
                <Prim kind="box" color={m.top} pos={[0, 0.0, -0.11]} scale={[0.215, 0.128, 0.14]} args={{ round: 0.06 }} />
                <Prim kind="box" color={m.topDark} pos={[0, -0.121, 0.36]} scale={[0.014, 0.005, 0.11]} outline={false} />
              </>
            )}
            {look.sari && (
              /* EP022 sari pallu: diagonal drape across the chest from the right hip over the left shoulder */
              <>
                <Prim kind="box" color={look.sari} pos={[0.02, -0.124, 0.26]} scale={[0.075, 0.012, 0.31]} rot={[0, -0.55, 0]} outline={0.005} />
                <Prim kind="box" color={look.sari} pos={[0.12, 0.03, 0.4]} scale={[0.07, 0.13, 0.05]} rot={[0, -0.3, 0]} outline={0.005} />
              </>
            )}
            {look.patch && (
              <group position={[-0.1, -0.123, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
                <Prim kind="cyl" color={PAL.yellow} scale={[0.032, 0.032, 0.006]} args={{ seg: 20 }} outline={0.003} />
                <Prim kind="cyl" color={PAL.blue} pos={[0, 0, 0.004]} scale={[0.018, 0.018, 0.004]} args={{ seg: 20 }} outline={false} />
              </group>
            )}
            {look.outfit === 'suit' && (
              <>
                {/* chest control unit, belt, backpack (life support) */}
                <Prim kind="box" color="#D9DEE6" pos={[0.02, -0.13, 0.27]} scale={[0.09, 0.03, 0.06]} args={{ round: 0.015 }} outline={0.005} />
                {[[-0.02, '#FF5A5F'], [0.02, '#5BE59B'], [0.06, PAL.yellow]].map(([x, c], i) => <Prim key={i} kind="sphere" color={c as string} pos={[x as number, -0.162, 0.28]} scale={0.009} outline={false} />)}
                <Prim kind="box" color="#C9D3E0" pos={[0, 0, 0.07]} scale={[0.215, 0.125, 0.025]} outline={0.004} />
                <Prim kind="box" color="#E4E9F0" pos={[0, 0.17, 0.3]} scale={[0.2, 0.08, 0.26]} args={{ round: 0.04 }} />
                <Prim kind="box" color="#2B3F6B" pos={[0.1, -0.124, 0.43]} scale={[0.04, 0.005, 0.022]} outline={0.003} />
              </>
            )}
            {look.outfit === 'gown' && [0, 1, 2].map((i) => <Prim key={i} kind="sphere" color={PAL.blue} pos={[-0.08 + i * 0.08, -0.121, 0.2 + 0.07 * (i % 2)]} scale={[0.013, 0.004, 0.013]} outline={false} />)}
            <N m={local.chest}>
              {look.outfit === 'hoodie' && <Prim kind="sphere" color={m.topDark} pos={[0, 0.1, 0.02]} scale={[0.17, 0.08, 0.07]} />}
              <N m={local.neck}>
                <Prim kind="cyl" mat={m.skinBody} pos={[0, 0, 0.04]} scale={[0.055, 0.055, 0.09]} outline={0.006} />
                {look.hairStyle === 'hijab' && <Prim kind="cyl" mat={m.hair} pos={[0, 0.0, 0.03]} scale={[0.085, 0.08, 0.11]} args={{ seg: 28 }} outline={0.006} />}
                {look.helmet && <Prim kind="torus" color="#C9D3E0" pos={[0, 0, 0.0]} scale={[0.16, 0.16, 0.2]} args={{ tube: 0.22, seg: 32 }} outline={0.006} />}
                <N m={local.head}>
                  {look.helmet && (
                    <>
                      <mesh position={[0, -0.01, 0.2]} scale={[0.34, 0.34, 0.36]} renderOrder={5}>
                        <sphereGeometry args={[1, 32, 24]} />
                        <meshToonMaterial color="#CFEFFF" transparent opacity={0.18} depthWrite={false} />
                      </mesh>
                      <Prim kind="box" color="#FFFFFF" pos={[-0.17, -0.27, 0.33]} scale={[0.02, 0.004, 0.09]} rot={[0, 0.5, 0]} outline={false} shadow={false} />
                    </>
                  )}
                  <group>
                    <mesh geometry={HEAD_GEO} material={m.skin} position={[0, 0, 0.21]} scale={[RX, RY, RZ]} castShadow receiveShadow />
                    <mesh geometry={HEAD_GEO} material={headOutline} position={[0, 0, 0.21]} scale={[RX, RY, RZ]} />
                    <mesh geometry={HEAD_GEO} material={m.skin} position={[0, -0.03, 0.12]} scale={[0.165, 0.15, 0.11]} castShadow receiveShadow />
                  </group>
                  {look.hairStyle !== 'hijab' && [-1, 1].map((sx) => (
                    <Prim key={sx} kind="sphere" mat={m.skin} pos={[sx * 0.205, 0, 0.2]} scale={[0.035, 0.025, 0.05]} outline={x > 0.5 ? false : 0.006} />
                  ))}
                  <Prim kind="sphere" mat={m.skin} pos={[0, -0.205, 0.175]} scale={[0.02, 0.022, 0.024]} outline={false} />
                  {/* blush */}
                  {[-1, 1].map((sx) => (
                    <Prim key={`b${sx}`} kind="sphere" mat={toon('#FF9AA8', { opacity: 0.55 * (1 - x) })} pos={[sx * 0.115, faceY(sx * 0.115, 0.15) + 0.002, 0.15]} scale={[0.03, 0.004, 0.014]} outline={false} shadow={false} />
                  ))}
                  <Eye side={1} m={m} pose={pose} />
                  <Eye side={-1} m={m} pose={pose} />
                  {[1, -1].map((sx) => {
                    const extra = 0;
                    return (
                      <group key={`br${sx}`} position={[sx * 0.08, faceY(sx * 0.08, 0.285) - 0.004, 0.285 + f.browZ + extra]} rotation={[0, f.browRot * sx, 0]}>
                        <Prim kind="box" mat={m.face} scale={[0.045, 0.008, 0.011]} outline={false} />
                      </group>
                    );
                  })}
                  <group position={[0, faceY(0, mz) - 0.004, mz]}>
                    <G pos={[0, 0, 0.012]} rot={[f.frown > 0.5 ? Math.PI / 2 : -Math.PI / 2, 0, 0]} scale={[0.045 * Math.max(0.6, smile), 0.045 * smile, 0.045]}>
                      <Prim kind="torus" mat={m.mouth} args={{ arc: Math.PI, tube: 0.2, seg: 12 }} outline={false} />
                    </G>
                    <Prim kind="sphere" mat={m.mouth} pos={[0, 0, -0.005]} scale={[(f.round > 0.5 ? 0.026 : 0.04) * open, 0.012 * Math.min(1, open * 4), 0.03 * open]} outline={false} />
                  </group>
                  {look.mask && <Prim kind="sphere" color="#CFEAF7" pos={[0, -0.06, 0.13]} scale={[0.19, 0.16, 0.1]} outline={0.008} />}
                  {look.mustache && [-1, 1].map((sx) => (
                    <Prim key={`ms${sx}`} kind="sphere" color={look.mustache} pos={[sx * 0.035, faceY(sx * 0.035, 0.15) - 0.012, 0.15]} scale={[0.045, 0.016, 0.017]} rot={[0, sx * 0.3, 0]} outline={0.004} />
                  ))}
                  {look.glasses && [-1, 1].map((sx) => (
                    <group key={`gls${sx}`} position={[sx * 0.078, faceY(sx * 0.078, 0.215) - 0.014, 0.215]} rotation={[Math.PI / 2, 0, 0]}>
                      <Prim kind="torus" color={PAL.navy} scale={[0.034, 0.028, 0.03]} args={{ tube: 0.08, seg: 24 }} outline={false} />
                    </group>
                  ))}
                  {look.glasses && <Prim kind="box" color={PAL.navy} pos={[0, faceY(0, 0.22) - 0.016, 0.22]} scale={[0.03, 0.004, 0.005]} outline={false} />}
                  {el > 0.02 && (
                    <group>
                      <Prim kind="sphere" mat={beard} pos={[0, -0.1, 0.06]} scale={[0.17 * el, 0.12 * el, 0.13 * el]} outline={0.008} />
                      <Prim kind="cone" mat={beard} pos={[0, -0.14, -0.04]} scale={[0.1 * el, 0.07 * el, 0.16 * el]} rot={[Math.PI, 0, 0]} args={{ seg: 10 }} outline={0.008} />
                      {[-1, 1].map((sx) => (
                        <Prim key={`mu${sx}`} kind="sphere" mat={beard} pos={[sx * 0.04, faceY(sx * 0.04, 0.145) - 0.01, 0.145]} scale={[0.055 * el, 0.02 * el, 0.022 * el]} rot={[0, sx * 0.35, 0]} outline={0.005} />
                      ))}
                      {[-1, 1].map((sx) => (
                        <group key={`gl${sx}`} position={[sx * 0.078, faceY(sx * 0.078, 0.215) - 0.012, 0.215]} rotation={[Math.PI / 2, 0, 0]} scale={el}>
                          <Prim kind="torus" color="#5A4632" scale={0.05} args={{ tube: 0.12, seg: 24 }} outline={false} />
                        </group>
                      ))}
                    </group>
                  )}
                  <Hair look={look} m={m} />
                  {look.turban && (
                    /* EP022 headcloth (pagri/gamcha): wrapped band + flattened crown */
                    <>
                      <Prim kind="torus" color={look.turban} pos={[0, 0.01, 0.31]} scale={[0.225, 0.225, 0.24]} args={{ tube: 0.13, seg: 28 }} outline={0.007} />
                      <Prim kind="sphere" color={look.turban} pos={[0, 0.02, 0.35]} scale={[0.215, 0.21, 0.12]} outline={0.007} />
                      <Prim kind="torus" color={look.turban} pos={[0.02, 0.0, 0.37]} scale={[0.19, 0.19, 0.2]} rot={[0.25, 0.15, 0]} args={{ tube: 0.1, seg: 24 }} outline={0.005} />
                    </>
                  )}
                  {look.bindi && <Prim kind="sphere" color={look.bindi} pos={[0, faceY(0, 0.3) - 0.004, 0.3]} scale={[0.012, 0.005, 0.012]} outline={false} shadow={false} />}
                  <N m={local.headC}>
                    {brainGeo && (
                      <group position={[0, 0.01, 0.025]} scale={0.29}>
                        <Brain geo={brainGeo} glow={pose.brainGlow} color={pose.brainColor} outline={x > 0.3} />
                      </group>
                    )}
                  </N>
                </N>
              </N>
              {(['L', 'R'] as const).map((side) => {
                const sx = side === 'L' ? 1 : -1;
                const forearmMat = look.outfit === 'hoodie' ? topMat : m.skinBody;
                return (
                  <N key={side} m={local[`sh${side}`]}>
                    <Prim kind="sphere" mat={topMat} pos={[0, 0, -0.02]} scale={0.075} outline={0.008} />
                    {look.outfit === 'gown' ? (
                      <>
                        <Prim kind="cyl" mat={topMat} pos={[0, 0, -0.08]} scale={[0.066, 0.066, 0.16]} />
                        <Prim kind="cyl" mat={m.skinBody} pos={[0, 0, -0.2]} scale={[0.048, 0.048, 0.15]} />
                      </>
                    ) : (
                      <Prim kind="cyl" mat={topMat} pos={[0, 0, -0.14]} scale={[0.058, 0.058, 0.29]} args={{ r2: 0.9 }} />
                    )}
                    <N m={local[`el${side}`]}>
                      <Prim kind="sphere" mat={forearmMat} scale={0.052} outline={0.006} />
                      <Prim kind="cyl" mat={forearmMat} pos={[0, 0, -0.11]} scale={[0.05, 0.05, 0.23]} args={{ r2: 0.85 }} />
                      {look.outfit === 'hoodie' && <Prim kind="cyl" color={m.topDark} pos={[0, 0, -0.215]} scale={[0.048, 0.048, 0.03]} outline={0.005} />}
                      <group position={[0, 0, -L2]}>
                        <Prim kind="sphere" mat={m.skinBody} scale={[0.064, 0.052, 0.068]} outline={0.008} />
                        <Prim kind="sphere" mat={m.skinBody} pos={[-sx * 0.03, -0.035, 0]} scale={[0.018, 0.018, 0.032]} outline={0.005} />
                        {pose.arms[side].finger > 0.05 && (
                          <Prim kind="cyl" mat={m.skinBody} pos={[0, 0, -0.085]} scale={[0.015 * pose.arms[side].finger, 0.015 * pose.arms[side].finger, 0.075 * pose.arms[side].finger]} outline={0.004} />
                        )}
                      </group>
                    </N>
                  </N>
                );
              })}
            </N>
          </N>
        </N>
        {(['L', 'R'] as const).map((side) => (
          <N key={side} m={local[`hip${side}`]}>
            <Prim kind="cyl" mat={legsMat} pos={[0, 0, -0.18]} scale={[0.08, 0.08, 0.38]} args={{ r2: 0.85 }} />
            <N m={local[`knee${side}`]}>
              <Prim kind="sphere" mat={legsMat} scale={0.068} outline={0.006} />
              <Prim kind="cyl" mat={legsMat} pos={[0, 0, -0.16]} scale={[0.066, 0.066, 0.34]} args={{ r2: 0.9 }} />
              <N m={local[`ankle${side}`]}>
                {look.outfit === 'gown' && <Prim kind="cyl" mat={m.skinBody} pos={[0, 0, 0.02]} scale={[0.05, 0.05, 0.06]} />}
                {look.barefoot ? (
                  /* EP022 bare feet / thin sandal */
                  <>
                    <Prim kind="box" mat={m.skinBody} pos={[0, -0.04, -0.02]} scale={[0.05, 0.11, 0.035]} args={{ round: 0.03 }} outline={0.005} />
                    <Prim kind="box" color="#5A3A24" pos={[0, -0.04, -0.058]} scale={[0.056, 0.118, 0.008]} args={{ round: 0.006 }} outline={0.003} />
                  </>
                ) : (
                  <>
                    <Prim kind="box" color="#F4F6FA" pos={[0, -0.045, -0.015]} scale={[0.066, 0.13, 0.05]} args={{ round: 0.04 }} />
                    <Prim kind="box" color={PAL.yellow} pos={[0, -0.045, -0.055]} scale={[0.069, 0.133, 0.014]} args={{ round: 0.01 }} outline={0.005} />
                  </>
                )}
              </N>
            </N>
          </N>
        ))}
        {look.sari && (
          /* EP022 sari skirt: ankle-length flared cone over the legs */
          <Prim kind="cone" color={look.sari} pos={[0, 0, -0.33]} scale={[0.24, 0.2, 0.8]} args={{ seg: 24 }} />
        )}
      </N>
    </N>
  );
};

const HEAD_GEO = new THREE.SphereGeometry(1, 36, 24);
export const HIPS_DEFAULT = HIP_Z;
export type { V3 };
