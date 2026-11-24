// World compiler: resolved storyboard scene -> pure, frame-evaluable model
// (actors, props, cameras, anchors). Shared by the 3D renderer and the 2D
// label projector so labels stick to objects exactly.
import * as THREE from 'three';
import { ActorAnim, ActorCfg } from './rig';
import { Track, V3, lensToFov, rng, toThree } from './math';
import { BRAIN_ANCHORS, CUT_ANCHORS, REGIONS, nerveCurves } from './anatomy';
import { FINGERS, HAND_ANCHORS, nerveCurve } from './props2';

export type SceneCfg = {
  id: string;
  frames: number;
  sets: Record<string, V3>;
  actors?: ActorCfg[];
  props?: Array<Record<string, any>>;
  shots: Array<{ at: number; set: string; lens?: number; keys: Array<{ at: number; pos?: any; aim?: any; lens?: number }>; shake?: { at: number; dur?: number; amp?: number } }>;
  anchors?: string[];
};

type Signal = { start: number; dur: number; size: number; curve: THREE.Curve<THREE.Vector3>; local?: THREE.Matrix4 };

export type PropModel =
  | { type: 'brain'; id: string; set: string; matrix: THREE.Matrix4; glow: Track<number>; color: Track<number>; colors: string[]; region: Record<string, Track<number>>; regionColor: Record<string, string>; spin: Track<number>; base: { pos: V3; scale: number; rotZ: number } }
  | { type: 'cutaway'; id: string; set: string; matrix: THREE.Matrix4; layer: Record<string, Track<number>>; vessel: Track<number>; nerveGrow: Track<number>; nerves: boolean; glow: Track<number>; glowColor: string; signals: Signal[] }
  | { type: 'pulses'; id: string; attach: string; offset: V3; starts: number[]; radius: number; color: string; dur: number }
  | { type: 'arrow'; id: string; set: string; from: THREE.Vector3; to: THREE.Vector3; mat: string; radius: number; grow: Track<number> }
  | { type: 'path'; id: string; set: string; curve: THREE.CatmullRomCurve3; bevel: number; grow: Track<number>; signals: Signal[]; mat: string }
  | { type: 'ring'; id: string; set: string; pos: THREE.Vector3; radius: number; scans: Array<{ a: number; b: number; from: number; to: number }> }
  | { type: 'cactus'; id: string; set: string; pos: THREE.Vector3 }
  | { type: 'label_anchor'; id: string; set: string; pos: THREE.Vector3 }
  | { type: 'hand'; id: string; set: string; matrix: THREE.Matrix4; wrinkle: Track<number>; xray: Track<number>; constrict: Track<number>; nerve: Track<number>; cutAt: number; wet: Track<number>; signals: Signal[]; pop: Track<number>; skin: string }
  | { type: 'tire'; id: string; set: string; pos: THREE.Vector3; scale: number; spin: Track<number>; pop: Track<number>; rotZ: number; shape?: string }
  | { type: 'soap'; id: string; set: string; shape: string; pos: Track<number[]>; spin: Track<number>; attach: Array<{ at: number; ref: string; offset: V3 }>; detach: number[]; hideAt: number; showAt: number }
  | { type: 'pills'; id: string; set: string; origin: THREE.Vector3; at: number; n: number; floorZ: number; spread: number }
  | { type: 'heart'; id: string; set: string; pos: THREE.Vector3; scale: number; phase: number[]; glow: Track<number>; pop: Track<number> };

const bm = (pos: V3, scale: number, rotZdeg = 0, rot?: number[]) => {
  const m = new THREE.Matrix4().makeTranslation(...pos);
  const r = rot ? new THREE.Euler(((rot[0] ?? 0) * Math.PI) / 180, ((rot[1] ?? 0) * Math.PI) / 180, ((rot[2] ?? rotZdeg) * Math.PI) / 180, 'ZYX') : new THREE.Euler(0, 0, (rotZdeg * Math.PI) / 180, 'ZYX');
  return m.multiply(new THREE.Matrix4().makeRotationFromEuler(r)).multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
};

export class World {
  actors: Record<string, ActorAnim> = {};
  actorSet: Record<string, string> = {};
  props: PropModel[] = [];
  propById: Record<string, PropModel> = {};
  shots: Array<{ at: number; set: string; pos: Track<number[]>; aim: Track<number[]>; lens: Track<number>; shake?: { at: number; dur: number; amp: number } }> = [];

  constructor(public cfg: SceneCfg) {
    // static scenery first (actors may reach for it), then actors, then animated props
    const props = cfg.props ?? [];
    // props that never depend on actors can be referenced by actor actions
    const STATIC = new Set(['cactus', 'label_anchor', 'hand', 'tire', 'piano', 'brain', 'cutaway', 'ring', 'heart']);
    for (const p of props.filter((p) => STATIC.has(p.type))) this.addProp(p);
    // pass 1: every actor exists in its initial pose (so actors can look at
    // each other), pass 2: full timelines
    for (const a of cfg.actors ?? []) {
      this.actorSet[a.id] = a.set;
      this.actors[a.id] = new ActorAnim({ ...a, timeline: (a.timeline ?? []).filter((e) => e.do === 'walk') }, cfg.sets[a.set], (spec, f) => this.point(spec, a.set, f ?? 0));
    }
    for (const a of cfg.actors ?? []) {
      this.actors[a.id] = new ActorAnim(a, cfg.sets[a.set], (spec, f) => this.point(spec, a.set, f ?? 0));
    }
    for (const p of props.filter((p) => !STATIC.has(p.type))) this.addProp(p);
    for (const sh of [...cfg.shots].sort((a, b) => a.at - b.at)) {
      const pos = new Track<number[]>([0, -3, 1.5]);
      const aim = new Track<number[]>([0, 0, 1]);
      const lens = new Track<number>(sh.lens ?? 35);
      for (const k of [...sh.keys].sort((a, b) => a.at - b.at)) {
        if (k.pos !== undefined) pos.set(k.at, this.point(k.pos, sh.set, k.at).toArray());
        if (k.aim !== undefined) aim.set(k.at, this.point(k.aim, sh.set, k.at).toArray());
        if (k.lens !== undefined) lens.set(k.at, k.lens);
      }
      this.shots.push({ at: sh.at, set: sh.set, pos, aim, lens, shake: sh.shake ? { at: sh.shake.at, dur: sh.shake.dur ?? 10, amp: sh.shake.amp ?? 0.02 } : undefined });
    }
  }

  origin(set?: string): V3 {
    return set && this.cfg.sets[set] ? this.cfg.sets[set] : [0, 0, 0];
  }

  /** spec: [x,y,z] set-local | "actor.part" | "prop.anchor" | {ref, offset} */
  point(spec: any, set: string | undefined, f = 0): THREE.Vector3 {
    if (typeof spec === 'string') spec = { ref: spec };
    if (Array.isArray(spec)) {
      const o = this.origin(set);
      return new THREE.Vector3(o[0] + (spec[0] ?? 0), o[1] + (spec[1] ?? 0), o[2] + (spec[2] ?? 0));
    }
    const off = new THREE.Vector3(...((spec.offset ?? [0, 0, 0]) as V3));
    return this.ref(spec.ref, f).add(off);
  }

  ref(name: string, f: number): THREE.Vector3 {
    const [head, part] = name.split('.');
    const actor = this.actors[head];
    if (actor) return actor.anchor(part ?? 'root', f);
    const p = this.propById[head];
    if (!p) throw new Error(`unknown reference ${name}`);
    if (p.type === 'brain') {
      const a = BRAIN_ANCHORS[part ?? 'center'] ?? [0, 0, 0];
      return new THREE.Vector3(...a).applyMatrix4(this.brainMatrix(p, f));
    }
    if (p.type === 'cutaway') {
      if (part?.startsWith('brain_')) {
        const a = BRAIN_ANCHORS[part.slice(6)] ?? [0, 0, 0];
        const inner = new THREE.Matrix4().makeTranslation(0, 0.02, -0.02).multiply(new THREE.Matrix4().makeScale(1.15, 1.18, 1.08));
        return new THREE.Vector3(...a).applyMatrix4(p.matrix.clone().multiply(inner));
      }
      return new THREE.Vector3(...(CUT_ANCHORS[part ?? 'brain'] ?? [0, 0, 0])).applyMatrix4(p.matrix);
    }
    if (p.type === 'cactus') return p.pos.clone().add(new THREE.Vector3(0, -0.07, 0.22));
    if (p.type === 'label_anchor' || p.type === 'ring') return p.pos.clone();
    if (p.type === 'path') return p.curve.getPointAt(0.5);
    if (p.type === 'arrow') return p.to.clone();
    if (p.type === 'hand') return new THREE.Vector3(...(HAND_ANCHORS[part ?? 'palm'] ?? [0, 0, 0])).applyMatrix4(p.matrix);
    if (p.type === 'tire') return p.pos.clone();
    if (p.type === 'soap') return this.soapPos(p, f);
    if (p.type === 'heart' || p.type === 'pills') return 'pos' in p ? (p as any).pos.clone() : (p as any).origin.clone();
    throw new Error(`cannot reference ${name}`);
  }

  brainMatrix(p: Extract<PropModel, { type: 'brain' }>, f: number) {
    return bm(p.base.pos, p.base.scale, p.base.rotZ + (p.spin.at(f) * 180) / Math.PI);
  }

  addProp(p: Record<string, any>) {
    const id = p.id as string;
    const set = p.set as string;
    const pos = (p.pos !== undefined ? this.point(p.pos, set, 0) : new THREE.Vector3(...this.origin(set))).toArray() as V3;
    const evs = [...(p.timeline ?? [])].sort((a, b) => a.at - b.at);
    let model: PropModel;
    switch (p.type) {
      case 'brain': {
        const region: Record<string, Track<number>> = {};
        const regionColor: Record<string, string> = {};
        const all = [...REGIONS, 'cerebellum', 'stem'];
        all.forEach((r) => (region[r] = new Track(0)));
        const glow = new Track<number>(0);
        const spin = new Track<number>(0);
        for (const ev of evs) {
          if (ev.do === 'glow') {
            const rs: string[] = ev.regions ?? all;
            for (const r of rs) {
              const t = region[r];
              t.set(ev.at, 0);
              t.set(ev.at + (ev.dur ?? 10), ev.strength ?? 1);
              if (ev.hold !== undefined) {
                t.set(ev.at + (ev.dur ?? 10) + ev.hold, ev.strength ?? 1);
                t.set(ev.at + (ev.dur ?? 10) + ev.hold + (ev.fade ?? 8), 0);
              }
              regionColor[r] = ev.color ?? '#7FC8FF';
            }
          } else if (ev.do === 'spin') {
            spin.set(ev.at, 0);
            spin.set(ev.until, (ev.turns ?? 0.25) * Math.PI * 2);
          }
        }
        const rot = p.rot ?? [0, 0, 0];
        model = { type: 'brain', id, set, matrix: bm(pos, p.scale ?? 0.75, rot[2]), glow, color: new Track(0), colors: ['#7FC8FF'], region, regionColor, spin, base: { pos, scale: p.scale ?? 0.75, rotZ: rot[2] ?? 0 } };
        break;
      }
      case 'cutaway': {
        const layer: Record<string, Track<number>> = { scalp: new Track(0), skull: new Track(0), dura: new Track(0) };
        const vessel = new Track<number>(0);
        const nerveGrow = new Track<number>(p.nerves === false ? 0 : 0);
        const glow = new Track<number>(0);
        const signals: Signal[] = [];
        let glowColor = '#FFD447';
        const curves = nerveCurves([0.7, 0.87, 0.76]);
        const matrix = bm(pos, p.scale ?? 1, (p.rot ?? [0, 0, 0])[2]);
        for (const ev of evs) {
          const dur = ev.dur ?? 8;
          if (ev.do === 'layer_glow') {
            const t = layer[ev.layer];
            t.set(ev.at, 0);
            t.set(ev.at + dur, ev.strength ?? 0.8);
            if (ev.until !== undefined) {
              t.set(ev.until, ev.strength ?? 0.8);
              t.set(ev.until + 8, 0);
            }
          } else if (ev.do === 'mat_glow') {
            vessel.set(ev.at, 0);
            vessel.set(ev.at + dur, 1);
          } else if (ev.do === 'grow_curves') {
            nerveGrow.set(ev.at, 0);
            nerveGrow.set(ev.at + (ev.dur ?? 15) + 3 * (curves.length - 1) * ((ev.stagger ?? 3) / 3), 1);
          } else if (ev.do === 'signal') {
            signals.push({ start: ev.at, dur: ev.dur ?? 20, size: ev.size ?? 0.04, curve: curves[ev.index ?? 0], local: matrix });
          } else if (ev.do === 'glow') {
            glow.set(ev.at, 0);
            glow.set(ev.at + (ev.dur ?? 10), ev.strength ?? 1);
            if (ev.hold !== undefined) {
              glow.set(ev.at + (ev.dur ?? 10) + ev.hold, ev.strength ?? 1);
              glow.set(ev.at + (ev.dur ?? 10) + ev.hold + (ev.fade ?? 8), 0);
            }
            glowColor = ev.color ?? glowColor;
          }
        }
        model = { type: 'cutaway', id, set, matrix, layer, vessel, nerveGrow, nerves: p.nerves !== false, glow, glowColor, signals };
        break;
      }
      case 'pulses':
        model = { type: 'pulses', id, attach: p.attach, offset: p.offset ?? [0, -0.12, 0.08], starts: p.starts ?? [], radius: p.radius ?? 0.35, color: p.color ?? '#FF4D57', dur: p.dur ?? 16 };
        break;
      case 'arrow': {
        const grow = new Track<number>(0);
        for (const ev of evs) if (ev.do === 'grow') {
          grow.set(ev.at, 0);
          grow.set(ev.at + (ev.dur ?? 8), 1);
        }
        model = { type: 'arrow', id, set, from: this.point(p.from, set, 0), to: this.point(p.to, set, 0), mat: p.mat ?? 'yellow', radius: p.radius ?? 0.022, grow };
        break;
      }
      case 'path': {
        const at = p.frame ?? 0;
        const pts = (p.points as any[]).map((q) => this.point(q, set, at));
        const curve = new THREE.CatmullRomCurve3(pts);
        const grow = new Track<number>(p.bevel === 0 ? 0 : 1);
        const signals: Signal[] = [];
        let hasGrow = false;
        for (const ev of evs) {
          if (ev.do === 'grow_curves') {
            hasGrow = true;
            grow.set(ev.at, 0);
            grow.set(ev.at + (ev.dur ?? 15), 1);
          } else if (ev.do === 'signal') signals.push({ start: ev.at, dur: ev.dur ?? 20, size: ev.size ?? 0.04, curve });
        }
        if (!hasGrow && p.bevel !== 0) grow.set(0, 1);
        model = { type: 'path', id, set, curve, bevel: p.bevel ?? 0.012, grow, signals, mat: p.mat ?? 'nerve' };
        break;
      }
      case 'ring':
        model = { type: 'ring', id, set, pos: new THREE.Vector3(...pos), radius: p.radius ?? 0.6, scans: evs.filter((e) => e.do === 'scan').map((e) => ({ a: e.at, b: e.until, from: e.from_dz ?? 0.5, to: e.to_dz ?? -0.5 })) };
        break;
      case 'cactus':
        model = { type: 'cactus', id, set, pos: new THREE.Vector3(...pos) };
        break;
      case 'label_anchor':
        model = { type: 'label_anchor', id, set, pos: new THREE.Vector3(...pos) };
        break;
      case 'hand': {
        const T = () => new Track<number>(0);
        const wrinkle = new Track<number>(p.wrinkle ?? 0), xray = T(), constrict = T(), nerve = T(), wet = new Track<number>(p.wet ?? 0);
        const pop = new Track<number>(1);
        const signals: Signal[] = [];
        let cutAt = p.cut ? 0 : 1e9;
        const matrix = bm(pos, p.scale ?? 1, 0, p.rot ?? [0, 0, 0]);
        const ramp = (tr: Track<number>, ev: any, to = 1) => {
          tr.set(ev.at, tr.at(ev.at));
          tr.set(ev.at + (ev.dur ?? 12), ev.to ?? to);
        };
        for (const ev of evs) {
          if (ev.do === 'wrinkle') ramp(wrinkle, ev);
          else if (ev.do === 'smooth') ramp(wrinkle, ev, 0);
          else if (ev.do === 'xray') ramp(xray, ev);
          else if (ev.do === 'xray_off') ramp(xray, ev, 0);
          else if (ev.do === 'constrict') ramp(constrict, ev);
          else if (ev.do === 'nerve') ramp(nerve, ev);
          else if (ev.do === 'wet') ramp(wet, ev);
          else if (ev.do === 'cut') cutAt = ev.at;
          else if (ev.do === 'pop_in') {
            pop.set(ev.at - 1, 0);
            pop.set(ev.at + (ev.dur ?? 8), 1);
          } else if (ev.do === 'pop_out') {
            pop.set(ev.at, 1);
            pop.set(ev.at + (ev.dur ?? 6), 0);
          } else if (ev.do === 'signal') {
            const fi = ev.finger ?? 1;
            signals.push({ start: ev.at, dur: ev.dur ?? 18, size: ev.size ?? 0.035, curve: nerveCurve(FINGERS[fi].x, FINGERS[fi].len), local: matrix });
          }
        }
        if (pop.keys.length && pop.keys[0].f > 0) pop.set(0, 0);
        model = { type: 'hand', id, set, matrix, wrinkle, xray, constrict, nerve, cutAt, wet, signals, pop, skin: p.skin ?? '#F7CBA6' };
        break;
      }
      case 'piano':
      case 'tire': {
        const spin = new Track<number>(0);
        const pop = new Track<number>(1);
        for (const ev of evs) {
          if (ev.do === 'spin') {
            spin.set(ev.at, spin.at(ev.at));
            spin.set(ev.until, spin.at(ev.at) + (ev.turns ?? 1) * Math.PI * 2);
          } else if (ev.do === 'pop_in') {
            pop.set(0, 0);
            pop.set(ev.at - 1, 0);
            pop.set(ev.at + (ev.dur ?? 8), 1);
          } else if (ev.do === 'pop_out') {
            pop.set(ev.at, 1);
            pop.set(ev.at + (ev.dur ?? 6), 0);
          }
        }
        model = { type: 'tire', id, set, pos: new THREE.Vector3(...pos), scale: p.scale ?? 1, spin, pop, rotZ: ((p.rot ?? [0, 0, 0])[2] * Math.PI) / 180, shape: p.type };
        break;
      }
      case 'item':
      case 'soap': {
        const tr = new Track<number[]>(pos);
        let hideAt = 1e9;
        let showAt = 0;
        const spin = new Track<number>(0);
        const attach: Array<{ at: number; ref: string; offset: V3 }> = [];
        const detach: number[] = [];
        for (const ev of evs) {
          if (ev.do === 'move') {
            const target = this.point(ev.pos, set, ev.at + (ev.dur ?? 10)).toArray();
            tr.set(ev.at, tr.at(ev.at));
            tr.set(ev.at + (ev.dur ?? 10), target);
            if (ev.spin) {
              spin.set(ev.at, spin.at(ev.at));
              spin.set(ev.at + (ev.dur ?? 10), spin.at(ev.at) + ev.spin * Math.PI * 2);
            }
          } else if (ev.do === 'attach') attach.push({ at: ev.at, ref: ev.ref, offset: ev.offset ?? [0, -0.06, 0] });
          else if (ev.do === 'hide') hideAt = ev.at;
          else if (ev.do === 'show') showAt = ev.at;
          else if (ev.do === 'detach') {
            detach.push(ev.at);
            // start the free flight exactly where the hand released it
            const last = [...attach].reverse().find((a) => a.at <= ev.at);
            if (last) tr.set(ev.at, this.ref(last.ref, ev.at).add(new THREE.Vector3(...last.offset)).toArray());
          }
        }
        model = { type: 'soap', id, set, shape: p.shape ?? 'soap', pos: tr, spin, attach, detach, hideAt, showAt };
        break;
      }
      case 'pills': {
        const spill = evs.find((e) => e.do === 'spill');
        const origin = spill?.from ? this.point(spill.from, set, spill.at) : new THREE.Vector3(...pos);
        model = { type: 'pills', id, set, origin, at: spill?.at ?? 1e9, n: p.count ?? 14, floorZ: p.floor_z ?? 0.79, spread: p.spread ?? 0.35 };
        break;
      }
      case 'heart': {
        const bpm = new Track<number>(p.bpm ?? 72);
        const glow = new Track<number>(0);
        const pop = new Track<number>(1);
        for (const ev of evs) {
          if (ev.do === 'bpm') {
            bpm.set(ev.at, bpm.at(ev.at));
            bpm.set(ev.at + (ev.dur ?? 15), ev.bpm);
          } else if (ev.do === 'glow') {
            glow.set(ev.at, glow.at(ev.at));
            glow.set(ev.at + (ev.dur ?? 8), ev.to ?? 1);
          } else if (ev.do === 'pop_in') {
            pop.set(0, 0);
            pop.set(ev.at - 1, 0);
            pop.set(ev.at + (ev.dur ?? 8), 1);
          }
        }
        // integrate beats -> phase per frame (deterministic)
        const phase: number[] = [];
        let ph = 0;
        for (let f = 0; f <= this.cfg.frames + 1; f++) {
          phase.push(ph);
          ph += bpm.at(f) / 60 / 30;
        }
        model = { type: 'heart', id, set, pos: new THREE.Vector3(...pos), scale: p.scale ?? 1, phase, glow, pop };
        break;
      }
      default:
        throw new Error(`unknown prop type ${p.type}`);
    }
    this.props.push(model);
    this.propById[id] = model;
  }

  soapPos(p: Extract<PropModel, { type: 'soap' }>, f: number): THREE.Vector3 {
    let att: { at: number; ref: string; offset: V3 } | null = null;
    for (const a of p.attach) if (f >= a.at && !p.detach.some((d) => d > a.at && d <= f)) att = a;
    if (att) return this.ref(att.ref, f).add(new THREE.Vector3(...att.offset));
    return new THREE.Vector3(...(p.pos.at(f) as V3));
  }

  shotAt(f: number) {
    let s = this.shots[0];
    for (const sh of this.shots) if (f >= sh.at) s = sh;
    return s;
  }

  camera(f: number) {
    const s = this.shotAt(f);
    const pos = s.pos.at(f) as V3;
    let aim = s.aim.at(f) as V3;
    if (s.shake && f >= s.shake.at && f < s.shake.at + s.shake.dur) {
      const r = rng(Math.floor(f / 2) * 7919 + 13);
      const k = 1 - (f - s.shake.at) / s.shake.dur;
      aim = [aim[0] + (r() * 2 - 1) * s.shake.amp * k, aim[1], aim[2] + (r() * 2 - 1) * s.shake.amp * k];
    }
    return { pos, aim, fov: lensToFov(s.lens.at(f)), set: s.set };
  }

  threeCamera(f: number, aspect = 1080 / 1920) {
    const c = this.camera(f);
    const cam = new THREE.PerspectiveCamera(c.fov, aspect, 0.02, 300);
    cam.position.copy(toThree(c.pos));
    cam.up.set(0, 1, 0);
    cam.lookAt(toThree(c.aim));
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    return cam;
  }

  /** anchor tracks in the same format the Blender pipeline exported */
  anchorTracks(names: string[]) {
    const out: Record<string, Array<[number, number, number] | null>> = {};
    for (const n of names) out[n] = [];
    for (let f = 0; f < this.cfg.frames; f++) {
      const cam = this.threeCamera(f);
      for (const n of names) {
        try {
          const p = toThree(this.ref(n, f)).project(cam);
          const x = (p.x + 1) / 2;
          const y = (1 - p.y) / 2;
          const vis = p.z < 1 && x >= 0 && x <= 1 && y >= 0 && y <= 1 ? 1 : 0;
          out[n].push([+x.toFixed(4), +y.toFixed(4), vis]);
        } catch {
          out[n].push(null);
        }
      }
    }
    return out;
  }
}
