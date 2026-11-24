import React from 'react';
import { Audio, Sequence, interpolate, staticFile } from 'remotion';
import { Sfx } from '../types';

export const SoundEffect: React.FC<{ name: string; volume?: number; dur?: number; fade?: number; loop?: boolean; offset?: number }> = ({ name, volume = 0.5, dur, fade = 0, loop, offset = 0 }) => (
  <Audio
    src={staticFile(`audio/sfx/${name}.wav`)}
    loop={loop}
    startFrom={offset}
    volume={(f) => (dur && fade > 0 ? volume * Math.min(interpolate(f, [0, fade], [0, 1], { extrapolateRight: 'clamp' }), interpolate(f, [dur - fade, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })) : volume)}
  />
);

/** one-shots default to 2 s; set `until` (scene-local frame, cue-resolved) for beds/ambience, `loop` to repeat, `fade` frames */
export const SoundEffects: React.FC<{ sfx: Sfx[] }> = ({ sfx }) => (
  <>
    {sfx.map((s, i) => {
      const dur = s.until !== undefined ? Math.max(1, s.until - s.at) : 60;
      return (
        <Sequence key={i} from={s.at} durationInFrames={dur} layout="none">
          <SoundEffect name={s.name} volume={s.volume} dur={dur} fade={s.fade} loop={s.loop} offset={s.offset} />
        </Sequence>
      );
    })}
  </>
);
