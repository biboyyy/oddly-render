// Cinematic 3D scene renderer for Remotion: real GLB assets, HDRI image-based
// lighting, PBR materials, shadows, fog, ocean, planets, starfields, keyframed
// camera with handheld shake, and post-processing (bloom, DOF, vignette, grain).
// Coordinate system: three.js native (Y up, metres). All `at` values are
// scene-local frames (resolved from storyboard cues by the pipeline).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { Environment, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise, DepthOfField, BrightnessContrast } from '@react-three/postprocessing';
import { staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { GLBModel, GLBSpec } from './GLBModel';
import { Box, Cast, CastSpec, Debris, Embers, Fire, Rain, Sign, Smoke, Steam, Puff, TradeScreen } from './Cast';
import { DEG, Key, noise1, sample } from './tracks';
import { Bridge, Terrain, Wind, Flutter, Sky } from './Bridge'; // ep017 procedural bridge/terrain/wind/flutter/sky
import { Beam, Clock, GpsSat, MapPin, OrbitLine, Phone, Rings, Rocket, WarpGrid } from './GpsFx';
import { MemsObject, MEMS_TYPES } from './MemsFx'; // ep018 MEMS accelerometer props
import { Army, Banner, Bucket, Gallop, LightCone } from './Medieval'; // ep019 medieval props
import { ElectricObject, ELECTRIC_TYPES } from './Electric'; // ep024 birds / power line / current / arc / tanks / kite / icons / glow / contact
import { AviationObject, AVIATION_TYPES } from './Aviation'; // ep026 jetliner / recorder / bubbles / truck / tower / forge
import { CargoObject, CARGO_TYPES } from './Cargo'; // ep027 crate / airliner / newspaper / haze

export type CineObject =
  | ({ type: 'glb' } & GLBSpec)
  | { type: 'planet'; id: string; texture: string; radius?: number; atmosphere?: string; spin?: number; tilt?: number; keys?: Key[]; emissive?: number }
  | { type: 'ocean'; id: string; normal: string; size?: number; color?: string; flow?: number; keys?: Key[]; repeat?: number; env?: number }
  | { type: 'bridge' | 'terrain' | 'wind' | 'flutter' | 'sky'; id: string; [k: string]: any }
  | { type: 'ground'; id: string; color?: string; size?: number; roughness?: number; keys?: Key[] }
  | { type: 'stars'; id: string; count?: number; radius?: number; size?: number; keys?: Key[] }
  | CastSpec
  | { type: 'rain'; id: string; count?: number; box?: number[]; center?: number[]; speed?: number; wind?: number[]; color?: string; opacity?: number; len?: number }
  | { type: 'fire'; id: string; pos: number[]; size?: number[]; height?: number; count?: number; scale?: number; light?: number; keys?: Key[] }
  | { type: 'embers'; id: string; center?: number[]; box?: number[]; count?: number; speed?: number; wind?: number[]; size?: number; color?: string; additive?: boolean }
  | { type: 'debris'; id: string; center?: number[]; box?: number[]; count?: number; wind?: number[]; speed?: number; size?: number }
  | { type: 'smoke'; id: string; center?: number[]; box?: number[]; count?: number; size?: number; color?: string; opacity?: number; rise?: number; drift?: number[] }
  | { type: 'tradescreen'; id: string; pos: number[]; rot?: number[]; size: number[]; crash: number; liq: number; start: number; end: number; pair?: string; light?: number }
  | { type: 'puff'; id: string; pos: number[]; at: number; dur?: number; dir?: number[]; count?: number; size?: number; opacity?: number; color?: string }
  | { type: 'puff'; id: string; pos: number[]; at: number; dur?: number; dir?: number[]; count?: number; size?: number; opacity?: number; color?: string }
  | { type: 'steam'; id: string; pos: number[]; count?: number; height?: number; size?: number; opacity?: number }
  | { type: 'sign'; id: string; text: string; size: number[]; bg?: string; fg?: string; glow?: number; keys?: Key[]; font?: string }
  | { type: 'box'; id: string; size: number[]; shape?: 'box' | 'sphere' | 'cylinder' | 'capsule'; opacity?: number; color?: string; emissive?: string; emissiveIntensity?: number; roughness?: number; metalness?: number; keys?: Key[]; shadow?: boolean };

export type CinematicSpec = {
  env?: { hdri?: string; background?: boolean; intensity?: number; rotation?: number; blur?: number };
  background?: string;
  fog?: { color: string; near?: number; far?: number; density?: number };
  exposure?: number;
  // ep024: 'hemi' (sky/ground fill: color + ground), 'rim' (camera-relative back light: dist, height, side, follows the camera)
  // sun extras: size (shadow frustum half-extent, default 12), mapSize (default 2048), target [x,y,z]
  lights?: Array<{ type: 'sun' | 'ambient' | 'point' | 'spot' | 'hemi' | 'rim'; pos?: number[]; color?: string; ground?: string; intensity?: number; shadow?: boolean; keys?: Key[]; target?: number[]; size?: number; mapSize?: number; dist?: number; height?: number; side?: number }>;
  objects: CineObject[];
  camera: { fov?: number; keys: Key[]; shake?: number; near?: number; far?: number };
  // ep024: grade = preset name (dusk | night | danger | calm_gold | clean | field) or {shadow, highlight, amount, sat}
  post?: { bloom?: number; threshold?: number; vignette?: number; noise?: number; dof?: { focus: number; range?: number; bokeh?: number }; contrast?: number; brightness?: number; grade?: string | { shadow?: string; highlight?: string; amount?: number; sat?: number } };
};

const CameraRig: React.FC<{ cam: CinematicSpec['camera'] }> = ({ cam }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const pos = sample<number[]>(cam.keys, 'pos', frame, [0, 1.6, 6]);
  const look = sample<number[]>(cam.keys, 'look', frame, [0, 1, 0]);
  const fov = sample<number>(cam.keys, 'fov', frame, cam.fov ?? 35);
  const roll = sample<number>(cam.keys, 'roll', frame, 0);
  const sh = sample<number>(cam.keys, 'shake', frame, cam.shake ?? 0.0);
  const t = frame / fps;
  const jo = sample<number>(cam.keys, 'jolt', frame, 0); // ep024: impact micro-shake (high frequency, keyed amplitude in m)
  const jx = jo * noise1(t * 23, 7), jy = jo * noise1(t * 27, 8);
  camera.position.set(pos[0] + sh * noise1(t * 0.9, 1) + jx, pos[1] + sh * noise1(t * 1.1, 2) + jy, pos[2] + sh * 0.5 * noise1(t * 0.7, 3));
  camera.fov = fov;
  camera.near = cam.near ?? 0.05;
  camera.far = cam.far ?? 5000;
  camera.updateProjectionMatrix();
  camera.lookAt(look[0] + sh * 0.5 * noise1(t * 0.8, 4) + jx * 0.6, look[1] + sh * 0.5 * noise1(t * 0.6, 5) + jy * 0.6, look[2]);
  camera.rotateZ(roll * DEG);
  return null;
};

const Planet: React.FC<{ o: Extract<CineObject, { type: 'planet' }> }> = ({ o }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const map = useTexture(staticFile(o.texture));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const r = o.radius ?? 1;
  const atmo = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(o.atmosphere ?? '#7FC8FF') } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); v = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; varying vec3 n; varying vec3 v; void main(){ float f = pow(1.0 - max(dot(n, v), 0.0), 3.0); gl_FragColor = vec4(c, f*0.9); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
  }), [o.atmosphere]);
  const pos = sample<number[]>(o.keys, 'pos', frame, [0, 0, 0]);
  const sc = sample<number>(o.keys, 'scale', frame, 1);
  const tilt = sample<number>(o.keys, 'tilt', frame, o.tilt ?? 0);
  const spin = (frame / fps) * (o.spin ?? 0) * DEG;
  if (sc < 1e-3) return null;
  return (
    <group position={pos as any} scale={sc} rotation={[0, 0, tilt * DEG]}>
      <mesh rotation={[0, spin, 0]} castShadow receiveShadow>
        <sphereGeometry args={[r, 128, 96]} />
        <meshStandardMaterial map={map} roughness={0.85} metalness={0} emissiveMap={map} emissive={'#ffffff'} emissiveIntensity={o.emissive ?? 0.02} />
      </mesh>
      {o.atmosphere && <mesh scale={1.035} material={atmo}><sphereGeometry args={[r, 64, 48]} /></mesh>}
    </group>
  );
};

const Ocean: React.FC<{ o: Extract<CineObject, { type: 'ocean' }> }> = ({ o }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useTexture(staticFile(o.normal));
  const [n1, n2] = useMemo(() => [n.clone(), n.clone()].map((x) => { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(o.repeat ?? 18, o.repeat ?? 18); x.needsUpdate = true; return x; }), [n, o.repeat]);
  const t = (frame / fps) * (o.flow ?? 1);
  n1.offset.set(t * 0.012, t * 0.008);
  n2.offset.set(-t * 0.009, t * 0.011);
  const y = sample<number>(o.keys, 'y', frame, 0);
  const size = o.size ?? 400;
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size, (o as any).segs ?? 1, (o as any).segs ?? 1]} />
        <meshPhysicalMaterial color={o.color ?? '#0d3a52'} roughness={0.08} metalness={0.05} clearcoat={1} clearcoatRoughness={0.12} normalMap={n1} normalScale={new THREE.Vector2(0.55, 0.55)} clearcoatNormalMap={n2} clearcoatNormalScale={new THREE.Vector2(0.35, 0.35)} envMapIntensity={o.env ?? 1.2} />
      </mesh>
    </group>
  );
};

const Stars: React.FC<{ o: Extract<CineObject, { type: 'stars' }> }> = ({ o }) => {
  const geo = useMemo(() => {
    const n = o.count ?? 4000, R = o.radius ?? 800;
    const p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
      p.set([R * rr * Math.cos(th), R * u, R * rr * Math.sin(th)], i * 3);
      const b = 0.55 + 0.45 * rnd(), warm = rnd();
      c.set([b, b * (0.92 + 0.08 * warm), b * (1.05 - 0.15 * warm)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  }, [o.count, o.radius]);
  return <points geometry={geo}><pointsMaterial size={o.size ?? 1.6} sizeAttenuation vertexColors transparent opacity={0.95} depthWrite={false} toneMapped={false} /></points>;
};

const RimLight: React.FC<{ l: any; cam: CinematicSpec['camera']; intensity: number }> = ({ l, cam, intensity }) => {
  // camera-relative back light: sits behind the look target (opposite the camera), raised and offset sideways
  const frame = useCurrentFrame();
  const target = useMemo(() => new THREE.Object3D(), []);
  const cp = sample<number[]>(cam.keys, 'pos', frame, [0, 1.6, 6]);
  const lk = sample<number[]>(cam.keys, 'look', frame, [0, 1, 0]);
  const d = new THREE.Vector3(lk[0] - cp[0], 0, lk[2] - cp[2]).normalize();
  const sd = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(l.side ?? 0.6);
  const D = l.dist ?? 8;
  const p = [lk[0] + (d.x + sd.x) * D, lk[1] + (l.height ?? 4), lk[2] + (d.z + sd.z) * D];
  target.position.set(lk[0], lk[1], lk[2]);
  return <><primitive object={target} /><directionalLight position={p as any} target={target} color={l.color ?? '#ffe2b8'} intensity={intensity} castShadow={false} /></>;
};

// ep024: sun with an explicit target (keeps the shadow frustum on the subject, e.g. birds 9 m up a pole)
const SunAt: React.FC<{ l: any; pos: number[]; intensity: number }> = ({ l, pos, intensity }) => {
  const target = useMemo(() => new THREE.Object3D(), []);
  target.position.set(l.target[0], l.target[1], l.target[2]);
  const p = [l.target[0] + pos[0], l.target[1] + pos[1], l.target[2] + pos[2]]; // pos = direction offset from the target
  const sz = l.size ?? 12;
  return <><primitive object={target} /><directionalLight position={p as any} target={target} color={l.color ?? '#fff'} intensity={intensity} castShadow={l.shadow !== false}
    shadow-mapSize={[l.mapSize ?? 2048, l.mapSize ?? 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
    shadow-camera-left={-sz} shadow-camera-right={sz} shadow-camera-top={sz} shadow-camera-bottom={-sz} shadow-camera-near={0.1} shadow-camera-far={sz * 10 + 40} /></>;
};

const Lights: React.FC<{ lights: NonNullable<CinematicSpec['lights']>; cam: CinematicSpec['camera'] }> = ({ lights, cam }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {lights.map((l, i) => {
        const pos = sample<number[]>(l.keys, 'pos', frame, l.pos ?? [5, 10, 5]);
        const intensity = sample<number>(l.keys, 'intensity', frame, l.intensity ?? 1);
        const color = l.color ?? '#ffffff';
        if (l.type === 'ambient') return <ambientLight key={i} color={color} intensity={intensity} />;
        if (l.type === 'hemi') return <hemisphereLight key={i} args={[color, l.ground ?? '#3a2a20', intensity]} />;
        if (l.type === 'rim') return <RimLight key={i} l={l} cam={cam} intensity={intensity} />;
        if (l.type === 'sun' && l.target) return <SunAt key={i} l={l} pos={pos} intensity={intensity} />;
        if (l.type === 'point') return <pointLight key={i} position={pos as any} color={color} intensity={intensity} distance={(l as any).distance ?? 0} decay={(l as any).decay ?? 2} castShadow={!!l.shadow} shadow-mapSize={[1024, 1024]} shadow-bias={-0.002} />;
        return (
          <directionalLight key={i} position={pos as any} color={color} intensity={intensity} castShadow={l.shadow !== false}
            shadow-mapSize={[l.mapSize ?? 2048, l.mapSize ?? 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}
            shadow-camera-left={-(l.size ?? 12)} shadow-camera-right={l.size ?? 12} shadow-camera-top={l.size ?? 12} shadow-camera-bottom={-(l.size ?? 12)} shadow-camera-near={0.5} shadow-camera-far={l.size ? l.size * 8 : 80} />
        );
      })}
    </>
  );
};

const Renderer: React.FC<{ spec: CinematicSpec }> = ({ spec }) => {
  const gl = useThree((s) => s.gl);
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = spec.exposure ?? 1;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  return null;
};

const SceneContent: React.FC<{ spec: CinematicSpec }> = ({ spec }) => {
  const p = spec.post ?? {};
  return (
    <>
      <Renderer spec={spec} />
      <color attach="background" args={[spec.background ?? '#000000']} />
      {spec.fog && (spec.fog.density ? <fogExp2 attach="fog" args={[spec.fog.color, spec.fog.density]} /> : <fog attach="fog" args={[spec.fog.color, spec.fog.near ?? 10, spec.fog.far ?? 120]} />)}
      {spec.env?.hdri && <Environment files={staticFile(spec.env.hdri)} background={spec.env.background ?? false} environmentIntensity={spec.env.intensity ?? 1} backgroundIntensity={spec.env.intensity ?? 1} environmentRotation={[0, (spec.env.rotation ?? 0) * DEG, 0]} backgroundRotation={[0, (spec.env.rotation ?? 0) * DEG, 0]} backgroundBlurriness={spec.env.blur ?? 0} />}
      <Lights lights={spec.lights ?? [{ type: 'ambient', intensity: 0.3 }, { type: 'sun' }]} cam={spec.camera} />
      <CameraRig cam={spec.camera} />
      {spec.objects.map((o) => {
        switch (o.type) {
          case 'glb': return <GLBModel key={o.id} spec={o} />;
          case 'planet': return <Planet key={o.id} o={o} />;
          case 'ocean': return <Ocean key={o.id} o={o} />;
          case 'stars': return <Stars key={o.id} o={o} />;
          case 'cast': return <Cast key={o.id} o={o} />;
          case 'rain': return <Rain key={o.id} o={o} />;
          case 'box': return <Box key={o.id} o={o} />;
          case 'steam': return <Steam key={o.id} o={o} />;
          case 'puff': return <Puff key={o.id} o={o as any} />;
          case 'tradescreen': return <TradeScreen key={o.id} o={o as any} />;
          case 'fire': return <Fire key={o.id} o={o} />;
          case 'embers': return <Embers key={o.id} o={o} />;
          case 'smoke': return <Smoke key={o.id} o={o} />;
          case 'debris': return <Debris key={o.id} o={o} />;
          case 'sign': return <Sign key={o.id} o={o} />;
          case 'bridge': return <Bridge key={o.id} o={o as any} />;
          case 'terrain': return <Terrain key={o.id} o={o as any} />;
          case 'wind': return <Wind key={o.id} o={o as any} />;
          case 'flutter': return <Flutter key={o.id} o={o as any} />;
          case 'sky': return <Sky key={o.id} o={o as any} />;
          // GPS / relativity props (GpsFx.tsx, EP016)
          case 'phone' as any: return <Phone key={(o as any).id} o={o as any} />;
          case 'clock' as any: return <Clock key={(o as any).id} o={o as any} />;
          case 'gpssat' as any: return <GpsSat key={(o as any).id} o={o as any} />;
          case 'beam' as any: return <Beam key={(o as any).id} o={o as any} />;
          case 'rings' as any: return <Rings key={(o as any).id} o={o as any} />;
          case 'warpgrid' as any: return <WarpGrid key={(o as any).id} o={o as any} />;
          case 'rocket' as any: return <Rocket key={(o as any).id} o={o as any} />;
          case 'orbitline' as any: return <OrbitLine key={(o as any).id} o={o as any} />;
          case 'mappin' as any: return <MapPin key={(o as any).id} o={o as any} />;
          // EP019 medieval props (Medieval.tsx)
          case 'army' as any: return <Army key={(o as any).id} o={o as any} />;
          case 'banner' as any: return <Banner key={(o as any).id} o={o as any} />;
          case 'bucket' as any: return <Bucket key={(o as any).id} o={o as any} />;
          case 'gallop' as any: return <Gallop key={(o as any).id} o={o as any} />;
          case 'lightcone' as any: return <LightCone key={(o as any).id} o={o as any} />;
          case 'ground': return (
            <mesh key={o.id} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, sample<number>(o.keys, 'y', 0, 0), 0]}>
              <planeGeometry args={[o.size ?? 200, o.size ?? 200]} />
              <meshStandardMaterial color={o.color ?? '#c8b48a'} roughness={o.roughness ?? 0.95} />
            </mesh>
          );
          default:
            if (ELECTRIC_TYPES.includes((o as any).type)) return <ElectricObject key={(o as any).id} o={o} />;
            if (AVIATION_TYPES.includes((o as any).type)) return <AviationObject key={(o as any).id} o={o} />;
            if (CARGO_TYPES.includes((o as any).type)) return <CargoObject key={(o as any).id} o={o} />;
            return MEMS_TYPES.includes((o as any).type) ? <MemsObject key={(o as any).id} o={o} /> : null;
        }
      })}
      {(spec.post as any)?.composer === true && <EffectComposer multisampling={4} enableNormalPass={false}>
        {p.dof ? <DepthOfField focusDistance={p.dof.focus} focalLength={p.dof.range ?? 0.05} bokehScale={p.dof.bokeh ?? 3} /> : <></>}
        <Bloom intensity={p.bloom ?? 0.6} luminanceThreshold={p.threshold ?? 0.8} luminanceSmoothing={0.2} mipmapBlur />
        <BrightnessContrast brightness={p.brightness ?? 0} contrast={p.contrast ?? 0.06} />
        <Vignette offset={0.3} darkness={p.vignette ?? 0.55} />
        <Noise opacity={p.noise ?? 0.025} />
      </EffectComposer>}
    </>
  );
};

// CSS post (works under --gl=swangle where EffectComposer renders blank):
// vignette, film grain, contrast/brightness, warm/cool grade.
// ep024 per-mood colour grades: shadow tint (soft-light) + highlight tint (overlay) + saturation
export const GRADES: Record<string, { shadow: string; highlight: string; amount: number; sat: number }> = {
  dusk: { shadow: '#3b1f63', highlight: '#ff9a4a', amount: 1, sat: 1.12 },
  night: { shadow: '#0b2a4f', highlight: '#5ab0ff', amount: 1, sat: 0.92 },
  danger: { shadow: '#4a0b2e', highlight: '#7fc8ff', amount: 1, sat: 1.05 },
  calm_gold: { shadow: '#4a2f1a', highlight: '#ffd38a', amount: 1, sat: 1.1 },
  clean: { shadow: '#1d2c4a', highlight: '#fff1d8', amount: 0.8, sat: 1.06 },
  field: { shadow: '#24361f', highlight: '#ffe2a8', amount: 0.9, sat: 1.12 },
};
const gradeOf = (g: NonNullable<CinematicSpec['post']>['grade']) => (!g ? null : typeof g === 'string' ? GRADES[g] ?? null : { shadow: g.shadow ?? '#000', highlight: g.highlight ?? '#fff', amount: g.amount ?? 1, sat: g.sat ?? 1 });

const CssPost: React.FC<{ p: NonNullable<CinematicSpec['post']> }> = ({ p }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const gr = gradeOf(p.grade);
  return (
    <>
      {gr && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: gr.shadow, mixBlendMode: 'soft-light', opacity: 0.55 * gr.amount }} />}
      {gr && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(180deg, ${gr.highlight} 0%, rgba(0,0,0,0) 75%)`, mixBlendMode: 'overlay', opacity: 0.22 * gr.amount }} />}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,${p.vignette ?? 0.55}) 100%)` }} />
      {(p.noise ?? 0.025) > 0 && (
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: (p.noise ?? 0.025) * 4, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
          <filter id="cgrain"><feTurbulence type="fractalNoise" baseFrequency="0.85" seed={frame % 9} /></filter>
          <rect width="100%" height="100%" filter="url(#cgrain)" />
        </svg>
      )}
    </>
  );
};

export const Cinematic: React.FC<{ spec: CinematicSpec }> = ({ spec }) => {
  const { width, height } = useVideoConfig();
  const p = spec.post ?? {};
  const frame = useCurrentFrame();
  const gr = gradeOf(p.grade);
  const blur = sample<number>(spec.camera.keys, 'blur', frame, 0); // ep024: whip-pan motion blur (px)
  const filter = `contrast(${1 + (p.contrast ?? 0.06)}) brightness(${1 + (p.brightness ?? 0)})${gr ? ` saturate(${gr.sat})` : ''}${blur > 0.05 ? ` blur(${blur.toFixed(2)}px)` : ''}`;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
    <div style={{ position: 'absolute', inset: 0, filter }}>
    <ThreeCanvas width={width} height={height} shadows gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }} camera={{ fov: spec.camera.fov ?? 35, position: [0, 1.6, 6], near: 0.05, far: 5000 }}>
      {/* ThreeCanvas wraps children in its own Suspense + delayRender, so asset loading blocks the frame */}
      <SceneContent spec={spec} />
    </ThreeCanvas>
    </div>
    <CssPost p={p} />
    </div>
  );
};
