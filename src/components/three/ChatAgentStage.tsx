import React from 'react';
import { Canvas } from '@react-three/fiber';
import type { AgentConfig } from '../../types';
import { paletteFor, botKindFor } from '../../lib/palette';
import { SourceBot, AgentMood } from './SourceBot';
import { StageLights, CameraRig, configureRenderer, usePrefersReducedMotion } from './StageCommon';

const TARGET: [number, number, number] = [0, 0.15, 0];
const BASE: [number, number, number] = [0, 0.9, 13.5];

export const ChatAgentStage: React.FC<{ agent: AgentConfig; mood: AgentMood }> = ({ agent, mood }) => {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: BASE, fov: 28 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={configureRenderer}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden
    >
      <StageLights />
      <CameraRig target={TARGET} base={BASE} strength={reducedMotion ? 0 : 0.7} />
      <SourceBot kind={botKindFor(agent)} palette={paletteFor(agent)} mood={mood} enterDelay={0.05} reducedMotion={reducedMotion} />
    </Canvas>
  );
};
