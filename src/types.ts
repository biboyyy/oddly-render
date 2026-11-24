import type { SceneCfg } from './three/world';
import type { Fx } from './components/FxLayer';
import type { MonitorCfg } from './components/HeartMonitor';
// Data contract between scripts/produce.mjs and the Remotion project.
export type Word = { text: string; hl: boolean; start: number; end: number };
export type SubtitleChunk = { start: number; end: number; words: Word[] };
export type Overlay = {
  text: string;
  at: number;
  until: number;
  style?: 'scale_up' | 'slide' | 'stamp';
  highlight?: string[];
  y?: number;
  size?: number;
};
export type Label = {
  anchor: string;
  text: string;
  sub?: string;
  at: number;
  until: number;
  side?: 'left' | 'right';
  dx?: number;
  dy?: number;
  tone?: 'yellow' | 'blue' | 'red' | 'white';
  icon?: 'check' | 'cross' | 'dot';
};
export type NarratorExpr = 'neutral' | 'explaining' | 'surprised' | 'thinking' | 'pointing';
export type NarratorCue = { at: number; expr: NarratorExpr };
export type Sfx = { at: number; name: string; volume?: number; until?: number; loop?: boolean; fade?: number; offset?: number };
export type AnchorTrack = Array<[number, number, number] | null>;

export type SceneData = {
  id: string;
  title: string;
  from: number;
  frames: number;
  video: string;
  audio: { src: string; offset: number; frames: number };
  mouth: number[]; // per-frame narration loudness 0..1 (scene-local)
  subtitles: SubtitleChunk[];
  overlays: Overlay[];
  labels: Label[];
  anchors: Record<string, AnchorTrack>;
  narrator: NarratorCue[];
  sfx: Sfx[];
  transition?: 'flash' | 'zoom' | 'whip' | 'none';
  cinematic?: import('./cinematic/Cinematic').CinematicSpec; // real-GLB cinematic engine
  scene3d?: SceneCfg; // three.js toon engine (when absent, `video` is used)
  fx?: Fx[];
  monitor?: MonitorCfg;
};

export type EpisodeData = {
  episode: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  header: { brand: string; category: string; episode_label: string; short_title: string };
  music: { src: string; volume: number; duckTo: number; segments?: Array<{ src: string; from: number; to: number }> } | null;
  scenes: SceneData[];
  outro: { from: number; frames: number; lines: string[] };
  layout?: EpisodeLayout;
};

/** Per-episode format switches ("explainer" = EP003 look, "funfact" = punchy). */
export type EpisodeLayout = {
  header?: boolean | 'full' | 'logo'; // full info header (default true)
  watermark?: boolean; // small ODDLY logo instead of header
  narrator?: boolean | 'bookends'; // always / only first & last scene / never
  subtitle?: 'phrase' | 'punch'; // punch = 1-2 big words centred
};
