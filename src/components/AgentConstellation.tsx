import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AgentConfig } from '../types';
import { AgentNode } from './AgentNode';
import { hasWebGL, WebGLBoundary } from './three/support';

const HeroStage = lazy(() => import('./three/HeroStage').then((m) => ({ default: m.HeroStage })));

interface AgentConstellationProps {
  agents: AgentConfig[];
  onSelectAgent: (agent: AgentConfig, initialPrompt?: string) => void;
  paused?: boolean;
  /** 0..1 progress of the hero scrolling out of view */
  scrollRef: React.MutableRefObject<number>;
}

export const AgentConstellation: React.FC<AgentConstellationProps> = ({ agents, onSelectAgent, paused = false, scrollRef }) => {
  const [activeSpeech, setActiveSpeech] = useState<{
    agentId: string;
    text: string;
  } | null>(null);

  // Dynamic subtle speech bubble engine
  useEffect(() => {
    // Initial random greeting from an agent after 1.5s
    const initialTimer = setTimeout(() => {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      if (randomAgent && randomAgent.personality.idlePhrases.length > 0) {
        const phrase = randomAgent.personality.idlePhrases[0];
        setActiveSpeech({ agentId: randomAgent.id, text: phrase });

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          setActiveSpeech(null);
        }, 4000);
      }
    }, 1500);

    // Periodic organic speech triggers (every 9 to 14 seconds)
    const interval = setInterval(() => {
      if (agents.length === 0) return;
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const phrases = randomAgent.personality.idlePhrases;
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];

      setActiveSpeech({ agentId: randomAgent.id, text: phrase });

      // Auto fade out after 4.5 seconds
      setTimeout(() => {
        setActiveSpeech((current) => (current?.agentId === randomAgent.id ? null : current));
      }, 4500);
    }, 10000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [agents]);

  // 2D fallback: lives in the lower/right part of the hero, like the 3D stage
  const fallback = (
    <div className="absolute inset-x-0 bottom-0 top-[46%] lg:top-0 lg:left-[38%] flex items-center justify-center">
      <div className="w-full max-w-2xl px-6">
        <div className="grid grid-cols-2 gap-y-12 gap-x-10 justify-items-center">
          {agents.map((agent, i) => (
            <AgentNode
              key={agent.id}
              agent={agent}
              side={i % 2 === 0 ? 'right' : 'left'}
              currentSpeech={activeSpeech?.agentId === agent.id ? activeSpeech.text : null}
              onSelect={onSelectAgent}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0" aria-label="Agents">
      {hasWebGL() ? (
        <WebGLBoundary fallback={fallback}>
          <Suspense fallback={null}>
            <HeroStage agents={agents} speech={activeSpeech} onSelect={onSelectAgent} paused={paused} scrollRef={scrollRef} />
          </Suspense>
        </WebGLBoundary>
      ) : (
        fallback
      )}
    </div>
  );
};
