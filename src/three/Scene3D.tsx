// The 3D scene for one storyboard scene, rendered with three.js inside
// Remotion. Only the set the active camera looks at is drawn.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useThree } from '@react-three/fiber';
import { World, PropModel } from './world';
import { Character } from './Character';
import { Bedroom, Futsal, Home, OperatingRoom, SET_LIGHT, SpaceStation, Studio, palOf } from './sets';
import { Brain, Cutaway, Tube, buildBrain } from './anatomy';
import { Prim, G } from './prims';
import { PAL, toon, outlineMat } from './toon';
import { toThree, V3 } from './math';
import { Ball, Bathroom, BATHROOM_LIGHT, Capsule, GiantHand, Heart, Phone, Piano, PillBottle, Soap, Tire } from './props2';
import { rng as rngF } from './math';

const CONV = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

const CameraRig: React.FC<{ world: World; frame: number }> = ({ world, frame }) => {
  const { camera, gl } = useThree();
  const c = world.camera(frame);
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = c.fov;
  cam.near = 0.02;
  cam.far = 300;
  cam.position.copy(toThree(c.pos));
  cam.up.set(0, 1, 0);
  cam.lookAt(toThree(c.aim));
  cam.updateProjectionMatrix();
  gl.localClippingEnabled = true;
  return null;
};

const Lights: React.FC<{ set: string; origin: V3 }> = ({ set, origin }) => {
  const all = { ...SET_LIGHT, bathroom: BATHROOM_LIGHT } as Record<string, (typeof SET_LIGHT)['bedroom']>;
  const L = all[set] ?? all[set.split('@')[0]];
  const target = useMemo(() => new THREE.Object3D(), []);
  const key = toThree([origin[0] + L.key[0], origin[1] + L.key[1], origin[2] + L.key[2]]);
  const tgt = toThree([origin[0] + L.target[0], origin[1] + L.target[1], origin[2] + L.target[2]]);
  target.position.copy(tgt);
  target.updateMatrixWorld();
  return (
    <>
      <hemisphereLight args={[L.sky, L.ground, L.ambient]} />
      <primitive object={target} />
      <directionalLight
        position={key}
        target={target}
        intensity={L.intensity}
        color={L.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
      />
    </>
  );
};

const Pulses: React.FC<{ p: Extract<PropModel, { type: 'pulses' }>; world: World; frame: number }> = ({ p, world, frame }) => {
  const at = world.ref(p.attach, frame);
  const items = p.starts
    .map((s) => (frame - s) / p.dur)
    .filter((t) => t >= 0 && t <= 1);
  return (
    <>
      {items.map((t, i) => {
        const r = p.radius * (0.2 + 0.8 * t);
        const m = toon(p.color, { emissive: p.color, emissiveIntensity: 0.8, opacity: Math.max(0.01, 0.5 * (1 - t)) });
        // toon "impact ring": a torus facing the camera-ish (+ a faint sphere)
        return (
          <group key={i} position={[at.x + p.offset[0], at.y + p.offset[1], at.z + p.offset[2]]}>
            <Prim kind="sphere" mat={m} scale={r} outline={false} shadow={false} />
            <Prim kind="torus" mat={toon(p.color, { emissive: p.color, emissiveIntensity: 1 })} rot={[Math.PI / 2, 0, 0]} scale={[r * 1.05, r * 1.05, r * 1.05]} args={{ tube: 0.05 * (1 - t) + 0.01, seg: 40 }} outline={false} shadow={false} />
          </group>
        );
      })}
    </>
  );
};

const SignalOrb: React.FC<{ s: { start: number; dur: number; size: number; curve: THREE.Curve<THREE.Vector3>; local?: THREE.Matrix4 }; frame: number }> = ({ s, frame }) => {
  const t = (frame - s.start) / s.dur;
  if (t < 0 || t > 1) return null;
  const p = s.curve.getPointAt(Math.min(1, Math.max(0, t)));
  if (s.local) p.applyMatrix4(s.local);
  const glowM = toon(PAL.yellow, { emissive: PAL.yellow, emissiveIntensity: 1.2 });
  const haloM = toon(PAL.yellow, { emissive: PAL.yellow, emissiveIntensity: 1, opacity: 0.35 });
  return (
    <group position={[p.x, p.y, p.z]}>
      <Prim kind="sphere" mat={glowM} scale={s.size} outline={0.006} shadow={false} />
      <Prim kind="sphere" mat={haloM} scale={s.size * 2.2} outline={false} shadow={false} />
      <pointLight color={PAL.yellow} intensity={0.6} distance={0.8} />
    </group>
  );
};

const Arrow3D: React.FC<{ p: Extract<PropModel, { type: 'arrow' }>; frame: number }> = ({ p, frame }) => {
  const g = p.grow.at(frame);
  if (g <= 0.001) return null;
  const d = p.to.clone().sub(p.from);
  const L = d.length() * g;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.clone().normalize());
  const iron = p.mat === 'iron'; // plain metal bar (no arrow head), e.g. a rod piercing something
  const color = p.mat === 'red_glow' ? '#FF5A5F' : iron ? '#55565c' : PAL.yellow;
  const m = toon(color, { emissive: color, emissiveIntensity: iron ? 0.08 : 0.5 });
  const hl = iron ? 0 : p.radius * 4.5;
  return (
    <group position={p.from} quaternion={q}>
      <Prim kind="cyl" mat={m} pos={[0, 0, Math.max(0.001, L - hl) / 2]} scale={[p.radius, p.radius, Math.max(0.001, L - hl)]} outline={0.008} />
      {!iron && <Prim kind="cone" mat={m} pos={[0, 0, L - hl / 2]} scale={[p.radius * 2.6, p.radius * 2.6, hl]} outline={0.008} />}
    </group>
  );
};

const Cactus: React.FC<{ pos: THREE.Vector3 }> = ({ pos }) => (
  <G pos={[pos.x, pos.y, pos.z]}>
    <Prim kind="cyl" color="#FFFFFF" pos={[0, 0, -0.03]} scale={[0.22, 0.22, 0.04]} args={{ seg: 24 }} />
    <Prim kind="cyl" color={PAL.navy} pos={[0, 0, -0.48]} scale={[0.03, 0.03, 0.9]} outline={0.005} />
    <Prim kind="cyl" color={PAL.navy} pos={[0, 0, -0.93]} scale={[0.16, 0.16, 0.02]} outline={0.005} />
    <Prim kind="cyl" color="#E07A4F" pos={[0, 0, 0.06]} scale={[0.08, 0.08, 0.12]} args={{ r2: 1.2 }} />
    <Prim kind="cyl" color="#4BB37A" pos={[0, 0, 0.2]} scale={[0.055, 0.055, 0.2]} args={{ r2: 0.85 }} />
    <Prim kind="sphere" color="#4BB37A" pos={[0, 0, 0.3]} scale={[0.047, 0.047, 0.04]} />
    <Prim kind="cyl" color="#4BB37A" pos={[0.07, 0, 0.21]} scale={[0.028, 0.028, 0.09]} rot={[0, 0.9, 0]} />
    <Prim kind="cyl" color="#4BB37A" pos={[0.1, 0, 0.26]} scale={[0.026, 0.026, 0.07]} />
    <Prim kind="sphere" color="#FF7EB3" pos={[0, 0, 0.345]} scale={[0.025, 0.025, 0.02]} outline={0.004} />
  </G>
);

const BrainProp: React.FC<{ p: Extract<PropModel, { type: 'brain' }>; world: World; frame: number }> = ({ p, world, frame }) => {
  const geo = useMemo(() => buildBrain(4), []);
  const m = world.brainMatrix(p, frame);
  const rg: Record<string, number> = {};
  for (const [k, t] of Object.entries(p.region)) rg[k] = t.at(frame);
  const color = Object.entries(p.region).reduce((c, [k, t]) => (t.at(frame) > 0.01 ? p.regionColor[k] ?? c : c), '#7FC8FF');
  return (
    <group matrixAutoUpdate={false} matrix={m}>
      <Brain geo={geo} regionGlow={rg} regionColor={color} id={p.id} />
    </group>
  );
};

const Ring: React.FC<{ p: Extract<PropModel, { type: 'ring' }>; frame: number }> = ({ p, frame }) => {
  const s = p.scans.find((x) => frame >= x.a && frame <= x.b);
  if (!s) return null;
  const t = (frame - s.a) / Math.max(1, s.b - s.a);
  const z = p.pos.z + s.from + (s.to - s.from) * t;
  return (
    <group position={[p.pos.x, p.pos.y, z]}>
      <Prim kind="torus" mat={toon(PAL.lightBlue, { emissive: PAL.lightBlue, emissiveIntensity: 1.2 })} scale={p.radius} args={{ tube: 0.025, seg: 64 }} outline={0.004} shadow={false} />
      <Prim kind="cyl" mat={toon(PAL.lightBlue, { emissive: PAL.lightBlue, emissiveIntensity: 0.6, opacity: 0.18 })} scale={[p.radius, p.radius, 0.002]} args={{ seg: 64 }} outline={false} shadow={false} />
    </group>
  );
};

const Props: React.FC<{ world: World; frame: number; set: string }> = ({ world, frame, set }) => (
  <>
    {world.props.map((p) => {
      if ('set' in p && p.set && p.set !== set) return null;
      switch (p.type) {
        case 'brain':
          return <BrainProp key={p.id} p={p} world={world} frame={frame} />;
        case 'cutaway': {
          const st = {
            layerGlow: { scalp: p.layer.scalp.at(frame), skull: p.layer.skull.at(frame), dura: p.layer.dura.at(frame) },
            vesselGlow: p.vessel.at(frame),
            nerveGrow: p.nerveGrow.at(frame),
            nerves: p.nerves,
            brainGlow: p.glow.at(frame),
            brainColor: p.glowColor,
          };
          return (
            <React.Fragment key={p.id}>
              <group matrixAutoUpdate={false} matrix={p.matrix}>
                <Cutaway world={p.matrix} state={st} id={p.id} />
              </group>
              {p.signals.map((s, i) => <SignalOrb key={i} s={s} frame={frame} />)}
            </React.Fragment>
          );
        }
        case 'pulses': {
          const actorSet = world.actorSet[p.attach.split('.')[0]];
          if (actorSet && actorSet !== set) return null;
          return <Pulses key={p.id} p={p} world={world} frame={frame} />;
        }
        case 'arrow':
          return <Arrow3D key={p.id} p={p} frame={frame} />;
        case 'path':
          return (
            <React.Fragment key={p.id}>
              {p.bevel > 0 && <Tube curve={p.curve} radius={p.bevel} color={PAL.yellow} emissive={0.6} grow={p.grow.at(frame)} />}
              {p.signals.map((s, i) => <SignalOrb key={i} s={s} frame={frame} />)}
            </React.Fragment>
          );
        case 'ring':
          return <Ring key={p.id} p={p} frame={frame} />;
        case 'cactus':
          return <Cactus key={p.id} pos={p.pos} />;
        case 'hand': {
          const pop = p.pop.at(frame);
          if (pop < 0.01) return null;
          const st = { wrinkle: p.wrinkle.at(frame), xray: p.xray.at(frame), constrict: p.constrict.at(frame), nerve: p.nerve.at(frame), cut: frame >= p.cutAt, wet: p.wet.at(frame), signals: [] };
          const m = p.matrix.clone().multiply(new THREE.Matrix4().makeScale(pop, pop, pop));
          return (
            <React.Fragment key={p.id}>
              <group matrixAutoUpdate={false} matrix={m}>
                <GiantHand s={st} id={p.id} skin={p.skin} />
              </group>
              {p.signals.map((s, i) => <SignalOrb key={i} s={s} frame={frame} />)}
            </React.Fragment>
          );
        }
        case 'tire': {
          const pop = p.pop.at(frame);
          if (pop < 0.01) return null;
          return (
            <group key={p.id} position={p.pos} scale={p.scale * pop} rotation={new THREE.Euler(0, 0, p.rotZ, 'ZYX')}>
              {p.shape === 'piano' ? <Piano /> : <Tire spin={p.spin.at(frame)} />}
            </group>
          );
        }
        case 'soap': {
          if (frame >= p.hideAt || frame < p.showAt) return null;
          const pos = world.soapPos(p, frame);
          return (
            <group key={p.id} position={pos}>
              {p.shape === 'bottle' ? <PillBottle spin={p.spin.at(frame)} /> : p.shape === 'phone' ? <Phone /> : p.shape === 'ball' ? <Ball spin={p.spin.at(frame)} /> : p.shape === 'pill' ? <Capsule rot={p.spin.at(frame)} /> : <Soap spin={p.spin.at(frame)} />}
            </group>
          );
        }
        case 'pills': {
          if (frame < p.at) return null;
          const r = rngF(7);
          const t = (frame - p.at) / 30;
          return (
            <group key={p.id}>
              {Array.from({ length: p.n }, (_, i) => {
                const delay = i * 0.035;
                const tt = Math.max(0, t - delay);
                const vx = (r() * 2 - 1) * p.spread, vy = (r() * 2 - 1) * p.spread * 0.6 - 0.15, vz = 0.6 + r() * 0.6;
                const z = Math.max(p.floorZ, p.origin.z + vz * tt - 4.9 * tt * tt);
                const landed = z <= p.floorZ + 1e-4;
                const tl = landed ? (vz + Math.sqrt(vz * vz + 4 * 4.9 * (p.origin.z - p.floorZ))) / (2 * 4.9) : tt;
                const k = Math.min(tt, tl);
                if (t < delay) return null;
                return (
                  <group key={i} position={[p.origin.x + vx * k, p.origin.y + vy * k, z + 0.006]}>
                    <Capsule rot={i * 1.7 + k * 9} />
                  </group>
                );
              })}
            </group>
          );
        }
        case 'heart': {
          const pop = p.pop.at(frame);
          if (pop < 0.01) return null;
          const ph = p.phase[Math.min(p.phase.length - 1, frame)] % 1;
          const pulse = Math.max(Math.exp(-((ph - 0.05) ** 2) / 0.003), 0.6 * Math.exp(-((ph - 0.22) ** 2) / 0.003));
          return (
            <group key={p.id} position={p.pos} scale={p.scale * pop}>
              <Heart pulse={pulse} glow={p.glow.at(frame)} />
            </group>
          );
        }
        default:
          return null;
      }
    })}
  </>
);

export const Scene3DContent: React.FC<{ world: World; frame: number }> = ({ world, frame }) => {
  const set = world.shotAt(frame).set;
  const kind = set.split('@')[0];
  const origin = world.cfg.sets[set];
  return (
    <>
      <CameraRig world={world} frame={frame} />
      <color attach="background" args={[kind === 'bathroom' ? BATHROOM_LIGHT.bg : (SET_LIGHT[set] ?? SET_LIGHT[kind]).bg]} />
      <Lights set={set} origin={origin} />
      {kind === 'home' && <pointLight position={toThree([origin[0], origin[1] + 0.9, origin[2] + 2.0])} color="#FFD48A" intensity={4} distance={6} decay={1.3} />}
      {set.includes('@night') && <pointLight position={toThree([origin[0] + 2.15, origin[1] + 2.52, origin[2] + 1.15])} color="#FFD9A0" intensity={3.5} distance={5} decay={1.2} />}
      <group matrixAutoUpdate={false} matrix={CONV}>
        {kind === 'bedroom' && <Bedroom origin={origin} night={set.includes('@night')} pal={palOf(set)} />}
        {kind === 'studio' && <Studio origin={origin} pal={palOf(set)} />}
        {kind === 'or' && <OperatingRoom origin={origin} pal={palOf(set)} />}
        {kind === 'bathroom' && <Bathroom origin={origin} frame={frame} />}
        {kind === 'iss' && <SpaceStation origin={origin} frame={frame} />}
        {kind === 'home' && <Home origin={origin} frame={frame} />}
        {kind === 'futsal' && <Futsal origin={origin} frame={frame} />}
        {Object.entries(world.actors).map(([id, a]) =>
          world.actorSet[id] === set ? <Character key={id} id={id} look={a.look} pose={a.poseAt(frame)} brain={!!a.cfg.brain} /> : null,
        )}
        <Props world={world} frame={frame} set={set} />
      </group>
    </>
  );
};

export const Scene3D: React.FC<{ world: World }> = ({ world }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 40, position: [0, 1.5, 4] }}>
      <Scene3DContent world={world} frame={frame} />
    </ThreeCanvas>
  );
};

export { outlineMat };
