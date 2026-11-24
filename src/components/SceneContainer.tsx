import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { SceneData } from '../types';
import { LabelLayer } from './LabelLayer';
import { SceneTransition } from './SceneTransition';
import { SoundEffects } from './SoundEffect';
import { SubtitleRenderer } from './SubtitleRenderer';
import { TitleOverlay } from './TitleOverlay';
import { FxLayer } from './FxLayer';
import { HeartMonitor } from './HeartMonitor';
import { Scene3D } from '../three/Scene3D';
import { World } from '../three/world';
import { Cinematic } from '../cinematic/Cinematic';

/** One storyboard scene: 3D (three.js toon engine or a pre-rendered Blender
 *  video) + labels + fx + titles + subtitles + narration + SFX.
 *  All timing is scene-local (frame 0 = scene start). */
export const SceneContainer: React.FC<{ scene: SceneData; punch?: boolean }> = ({ scene, punch }) => {
  const world = useMemo(() => (scene.scene3d ? new World(scene.scene3d) : null), [scene.scene3d]);
  const anchors = useMemo(() => {
    if (!world) return scene.anchors;
    const names = Array.from(new Set([...(scene.labels ?? []).map((l) => l.anchor), ...(scene.fx ?? []).filter((f) => f.anchor).map((f) => f.anchor as string)]));
    return world.anchorTracks(names);
  }, [world, scene]);
  return (
    <AbsoluteFill>
      <SceneTransition type={scene.transition ?? 'zoom'}>
        {scene.cinematic ? <Cinematic spec={scene.cinematic} /> : world ? <Scene3D world={world} /> : <OffthreadVideo src={staticFile(scene.video)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </SceneTransition>
      {/* readability gradients for header (top) and subtitles (bottom) */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(16,27,50,0.5) 0%, rgba(16,27,50,0) 15%, rgba(16,27,50,0) 60%, rgba(16,27,50,0.45) 100%)' }} />
      <FxLayer fx={scene.fx ?? []} anchors={anchors} />
      {scene.monitor && <HeartMonitor cfg={scene.monitor} />}
      <LabelLayer labels={scene.labels} anchors={anchors} />
      <TitleOverlay overlays={scene.overlays} />
      <SubtitleRenderer chunks={scene.subtitles} mode={punch ? 'punch' : 'phrase'} />
      <Sequence from={scene.audio.offset} layout="none">
        <Audio src={staticFile(scene.audio.src)} volume={1} />
      </Sequence>
      <SoundEffects sfx={scene.sfx} />
    </AbsoluteFill>
  );
};
