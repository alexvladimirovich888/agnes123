import * as THREE from 'three';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, PerformanceMonitor } from '@react-three/drei';
import { AnimatePresence } from 'motion/react';
import type { AgentConfig } from '../../types';
import { paletteFor, botKindFor } from '../../lib/palette';
import { SourceBot, AgentMood, BOT_TOP, BOT_BOTTOM } from './SourceBot';
import { SourceCore } from './SourceCore';
import { StageLights, CameraRig, configureRenderer } from './StageCommon';
import { usePrefersReducedMotion, useCanHover } from './support';
import { AgentHoverCard } from '../AgentHoverCard';
import { SpeechBubble } from '../SpeechBubble';

interface HeroStageProps {
  agents: AgentConfig[];
  speech: { agentId: string; text: string } | null;
  onSelect: (agent: AgentConfig, initialPrompt?: string) => void;
  paused?: boolean;
  /** 0..1 progress of the hero scrolling out of view */
  scrollRef: React.MutableRefObject<number>;
}

const CAMERA_BASE: [number, number, number] = [0, 2.3, 17];
const LOOK: [number, number, number] = [0, 0, 0];
const ORBIT = { wide: { rx: 5.4, rz: 2.3 }, narrow: { rx: 3.1, rz: 2.9 } };

type Side = 'left' | 'right';

interface SceneProps extends HeroStageProps {
  hovered: string | null;
  setHover: (id: string | null) => void;
  holdHover: () => void;
  canHover: boolean;
  reducedMotion: boolean;
  portal: React.MutableRefObject<HTMLElement>;
}

const Scene: React.FC<SceneProps> = ({ agents, speech, onSelect, hovered, setHover, holdHover, canHover, reducedMotion, portal, scrollRef, paused }) => {
  const { size, viewport, camera } = useThree();
  const wide = size.width >= 900 && size.width / size.height > 1.1;
  const n = agents.length;

  const { rx: RX, rz: RZ } = wide ? ORBIT.wide : ORBIT.narrow;
  const layout = useMemo(() => {
    const vp = viewport.getCurrentViewport(camera, new THREE.Vector3(...LOOK));
    const W = 2 * (RX + 1.25);
    const H = BOT_TOP - BOT_BOTTOM + 1.6 + RZ * 0.9;
    if (wide) {
      const availW = vp.width * 0.58;
      const availH = vp.height * 0.86;
      const scale = Math.min(1.4, availW / W, availH / H);
      return { scale, x: vp.width * 0.5 - availW * 0.5 - vp.width * 0.005, y: -vp.height * 0.02 };
    }
    const availW = vp.width * 1.0;
    const availH = vp.height * 0.56;
    const scale = Math.min(1, availW / W, availH / H);
    return { scale, x: 0, y: -vp.height * 0.5 + availH * 0.5 - vp.height * 0.01 };
  }, [viewport, camera, wide, RX, RZ, size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

  const stage = useRef<THREE.Group>(null!);
  const orbit = useRef(Math.PI * 0.25);
  const botRefs = useRef<(THREE.Group | null)[]>([]);
  const sides = useRef<Record<string, Side>>({});
  const [sideFor, setSideFor] = useState<Record<string, Side>>({});
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const [bubbleSide, setBubbleSide] = useState<Side>('right');
  useEffect(() => {
    if (speech) setBubbleSide(sides.current[speech.agentId] || 'right');
  }, [speech]);

  // Freeze the hover-card side when an agent becomes hovered (from the bot or its label)
  useEffect(() => {
    if (hovered) setSideFor((s) => ({ ...s, [hovered]: sides.current[hovered] || 'right' }));
  }, [hovered]);

  useFrame((state, dt) => {
    const p = scrollRef.current;
    const still = hovered !== null || paused || reducedMotion;
    orbit.current += still ? 0 : dt * (0.07 + p * 0.25);
    agents.forEach((_, i) => {
      const g = botRefs.current[i];
      if (!g) return;
      const a = orbit.current + (i / n) * Math.PI * 2;
      g.position.set(Math.cos(a) * RX, -Math.sin(a) * 0.35, Math.sin(a) * RZ);
      // the side the hover card opens on: towards the middle of the screen
      g.getWorldPosition(tmp).project(state.camera);
      sides.current[agents[i].id] = tmp.x > 0.05 ? 'left' : 'right';
    });
    stage.current.rotation.x = THREE.MathUtils.damp(stage.current.rotation.x, p * 0.55, 6, dt);
    stage.current.position.y = layout.y + p * 2.2;
  });

  return (
    <group ref={stage} position={[layout.x, layout.y, 0]} scale={layout.scale}>
      <SourceCore energy={hovered ? 1 : 0} flowRef={scrollRef} reducedMotion={reducedMotion} particles={wide ? 560 : 320} />

      {agents.map((agent, i) => {
        const palette = paletteFor(agent);
        const isHovered = hovered === agent.id;
        const isSpeaking = speech?.agentId === agent.id;
        const mood: AgentMood = isHovered ? 'attention' : isSpeaking ? 'speaking' : 'idle';
        const side = sideFor[agent.id] || 'right';

        return (
          <group key={agent.id} ref={(el) => (botRefs.current[i] = el)}>
            <SourceBot
              kind={botKindFor(agent)}
              palette={palette}
              mood={mood}
              enterDelay={0.5 + i * 0.18}
              reducedMotion={reducedMotion}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHover(agent.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHover(null);
                document.body.style.cursor = '';
              }}
              onClick={(e) => {
                e.stopPropagation();
                document.body.style.cursor = '';
                onSelect(agent);
              }}
            >
              <Html position={[0, BOT_TOP + 0.15, 0]} portal={portal} zIndexRange={[30, 20]} style={{ pointerEvents: 'none' }}>
                <div style={{ transform: wide ? 'translate(-50%, -100%)' : `translate(${bubbleSide === 'left' ? -88 : -12}%, -100%)` }}>
                  <SpeechBubble
                    text={!isHovered && isSpeaking ? speech!.text : null}
                    agentName={agent.name}
                    glow={palette.glow}
                    isVisible={!isHovered && isSpeaking}
                    compact={!wide}
                  />
                </div>
              </Html>

              {canHover && (
                <Html position={[side === 'right' ? 1.45 : -1.45, 0.4, 0]} portal={portal} zIndexRange={[40, 31]}>
                  <div
                    style={{ transform: side === 'right' ? 'translate(0, -50%)' : 'translate(-100%, -50%)' }}
                    onMouseEnter={holdHover}
                    onMouseLeave={() => setHover(null)}
                  >
                    <AnimatePresence>{isHovered && <AgentHoverCard agent={agent} onSelect={onSelect} side={side} />}</AnimatePresence>
                  </div>
                </Html>
              )}

              <Html position={[0, BOT_BOTTOM - 0.05, 0]} portal={portal} zIndexRange={[19, 10]}>
                <button
                  type="button"
                  onClick={() => onSelect(agent)}
                  onMouseEnter={() => setHover(agent.id)}
                  onMouseLeave={() => setHover(null)}
                  className="stage-label"
                  style={{ ['--agent-glow' as string]: palette.glow, ['--agent-text' as string]: palette.text, animationDelay: `${1.1 + i * 0.18}s` }}
                  data-active={isHovered || undefined}
                  data-compact={!wide || undefined}
                >
                  <span className="stage-label-name">{agent.name}</span>
                  {wide && <span className="stage-label-role">{agent.role}</span>}
                </button>
              </Html>
            </SourceBot>
          </group>
        );
      })}
    </group>
  );
};

export const HeroStage: React.FC<HeroStageProps> = (props) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const overlay = useRef<HTMLDivElement>(null!);
  const reducedMotion = usePrefersReducedMotion();
  const canHover = useCanHover();

  const setHover = (id: string | null) => {
    window.clearTimeout(closeTimer.current);
    if (id) setHovered(id);
    else closeTimer.current = window.setTimeout(() => setHovered(null), 220);
  };
  const holdHover = () => window.clearTimeout(closeTimer.current);
  // Adaptive resolution: start sharp, step down on slow devices
  const [dpr, setDpr] = useState(() => Math.min(1.75, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1));

  return (
    <div className="absolute inset-0 isolate">
      <Canvas
        dpr={dpr}
        camera={{ position: CAMERA_BASE, fov: 30, near: 0.1, far: 120 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={configureRenderer}
        frameloop={props.paused ? 'never' : 'always'}
        style={{ position: 'absolute', inset: 0 }}
        aria-label="SourceBots agents orbiting the source"
      >
        <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(0.75, d - 0.35))} onIncline={() => setDpr((d) => Math.min(1.75, d + 0.25))} flipflops={4} />
        <StageLights />
        <CameraRig target={LOOK} base={CAMERA_BASE} strength={reducedMotion ? 0 : 1.1} scrollRef={props.scrollRef} />
        <Scene
          {...props}
          hovered={hovered}
          setHover={setHover}
          holdHover={holdHover}
          canHover={canHover}
          reducedMotion={reducedMotion}
          portal={overlay as React.MutableRefObject<HTMLElement>}
        />
      </Canvas>
      <div ref={overlay} className="pointer-events-none absolute inset-0 [&>*]:pointer-events-auto" />
    </div>
  );
};
