import React from 'react';
import { Composition, Still } from 'remotion';
import { NarratorSheet, NarratorStill } from './compositions/NarratorSheet';
import { VideoComposition } from './compositions/VideoComposition';
import { EPISODES } from './generated/episodes';
import { Bench } from './three/Bench';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {Object.entries(EPISODES).map(([id, data]) => (
        <Composition
          key={id}
          id={`ODDLY-${id}`}
          component={VideoComposition}
          durationInFrames={data.durationInFrames}
          fps={data.fps}
          width={data.width}
          height={data.height}
          defaultProps={{ data }}
          calculateMetadata={({ props }) => ({ durationInFrames: props.data.durationInFrames })}
        />
      ))}
      <Composition id="Bench" component={Bench} durationInFrames={150} fps={30} width={1080} height={1920} />
      <Still id="NarratorSheet" component={NarratorSheet} width={1930} height={555} />
      <Still id="NarratorStill" component={NarratorStill} width={400} height={520} defaultProps={{ expr: 'neutral' as const, talking: false }} />
    </>
  );
};
