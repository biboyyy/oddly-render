import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { BackgroundMusic } from '../components/BackgroundMusic';
import { HeaderOverlay } from '../components/HeaderOverlay';
import { NarratorOverlay } from '../components/NarratorOverlay';
import { OutroComponent } from '../components/OutroComponent';
import { SceneContainer } from '../components/SceneContainer';
import { SoundEffects } from '../components/SoundEffect';
import { COLORS } from '../theme';
import { EpisodeData } from '../types';
import { loadFonts } from '../utils/fonts';
import { Watermark } from '../components/Watermark';

loadFonts();

export type VideoProps = { data: EpisodeData };

export const VideoComposition: React.FC<VideoProps> = ({ data }) => {
  return (
    <AbsoluteFill style={{ background: COLORS.navy }}>
      {data.scenes.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={`${s.id} · ${s.title}`}>
          <SceneContainer scene={s} punch={data.layout?.subtitle === 'punch'} />
        </Sequence>
      ))}
      <Sequence from={data.outro.from} durationInFrames={data.outro.frames} name="Outro">
        <OutroComponent lines={data.outro.lines} />
        <SoundEffects sfx={[{ at: 2, name: 'whoosh', volume: 0.35 }, { at: 12, name: 'ding', volume: 0.35 }]} />
      </Sequence>
      {(data.layout?.header ?? true) && <HeaderOverlay header={data.header} hideFrom={data.outro.from} progressTotal={data.outro.from} mode={data.layout?.header === 'full' ? 'full' : 'logo'} />}
      {data.layout?.watermark && <Watermark hideFrom={data.outro.from} />}
      {(data.layout?.narrator ?? true) === true && <NarratorOverlay scenes={data.scenes} hideFrom={data.outro.from} />}
      {data.layout?.narrator === 'bookends' && (
        <>
          <Sequence from={0} durationInFrames={data.scenes[0].frames} layout="none">
            <NarratorOverlay scenes={data.scenes} hideFrom={data.scenes[0].frames - 8} />
          </Sequence>
          <Sequence from={data.scenes[data.scenes.length - 1].from} layout="none">
            <NarratorOverlay scenes={data.scenes} hideFrom={data.outro.from} offset={data.scenes[data.scenes.length - 1].from} />
          </Sequence>
        </>
      )}
      <BackgroundMusic data={data} />
    </AbsoluteFill>
  );
};
