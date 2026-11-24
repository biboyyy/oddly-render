// Toon (cel-shaded) material system: hard 3-band lighting + inverted-hull
// outlines in the ODDLY palette.
import * as THREE from 'three';

export const INK = '#101B32';

export const PAL = {
  navy: '#101B32',
  blue: '#2865A5',
  lightBlue: '#7FC8FF',
  yellow: '#FFD447',
  white: '#FFFFFF',
  skin: '#F7CBA6',
  hair: '#1B1E2B',
  red: '#FF5A5F',
  pink: '#F49AB0',
};

let gradient: THREE.DataTexture | null = null;
export const toonGradient = () => {
  if (gradient) return gradient;
  // 3 hard bands: shadow / mid / lit
  gradient = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 185, 185, 185, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
};

const cache = new Map<string, THREE.Material>();

export type MatOpts = { emissive?: string; emissiveIntensity?: number; opacity?: number; side?: THREE.Side; clip?: THREE.Plane[]; unique?: string; flat?: boolean };

export const toon = (color: string, o: MatOpts = {}): THREE.MeshToonMaterial => {
  const key = o.unique ?? `${color}|${o.emissive}|${o.emissiveIntensity}|${o.opacity}|${o.side}|${o.clip ? 'c' : ''}|${o.flat}`;
  if (!o.unique && cache.has(key)) return cache.get(key) as THREE.MeshToonMaterial;
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient(),
    emissive: o.emissive ?? '#000000',
    emissiveIntensity: o.emissiveIntensity ?? 0,
    transparent: (o.opacity ?? 1) < 1 || !!o.unique,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
    clippingPlanes: o.clip ?? null,
    clipIntersection: !!o.clip,
  });
  if (!o.unique) cache.set(key, m);
  return m;
};

export const basic = (color: string, opacity = 1) => {
  const key = `basic|${color}|${opacity}`;
  if (cache.has(key)) return cache.get(key) as THREE.MeshBasicMaterial;
  const m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, toneMapped: false });
  cache.set(key, m);
  return m;
};

/** Inverted hull: back faces pushed out along normals, flat ink colour. */
const outlineCache = new Map<string, THREE.ShaderMaterial>();
export const outlineMat = (thickness = 0.012, color = INK, clip?: THREE.Plane[]) => {
  const key = `${thickness}|${color}|${clip ? 'c' : ''}`;
  if (!clip && outlineCache.has(key)) return outlineCache.get(key)!;
  const m = new THREE.ShaderMaterial({
    uniforms: { thickness: { value: thickness }, color: { value: new THREE.Color(color) }, opacity: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float thickness;
      #include <clipping_planes_pars_vertex>
      void main() {
        vec3 n = normalize(normal);
        // compensate non-uniform object scale so the line width stays even
        vec3 s = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
        vec3 p = position + n * thickness / max(s, vec3(1e-4));
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float opacity;
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        gl_FragColor = vec4(color, opacity);
      }`,
    side: THREE.BackSide,
    clipping: !!clip,
    clippingPlanes: clip ?? null,
    clipIntersection: !!clip,
    transparent: false,
  });
  if (!clip) outlineCache.set(key, m);
  return m;
};
