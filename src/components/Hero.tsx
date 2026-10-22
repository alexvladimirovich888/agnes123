import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from 'motion/react';
import { Terminal, Github, MousePointerClick } from 'lucide-react';
import { REPO_URL } from '../lib/links';
import type { AgentConfig } from '../types';
import { AgentConstellation } from './AgentConstellation';

interface HeroProps {
  agents: AgentConfig[];
  onSelectAgent: (agent: AgentConfig, initialPrompt?: string) => void;
  onOpenRunLocally: () => void;
  chatOpen: boolean;
}

const ease = [0.16, 1, 0.3, 1] as const;
const LINES = ['Open-source', 'agents that', 'do the work.'];

export const Hero: React.FC<HeroProps> = ({ agents, onSelectAgent, onOpenRunLocally, chatOpen }) => {
  const ref = useRef<HTMLElement>(null);
  const scrollRef = useRef(0);
  const inView = useInView(ref, { margin: '0px 0px -10% 0px' });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => (scrollRef.current = v));
  const textY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section id="top" ref={ref} className="relative h-[100svh] min-h-[680px] w-full overflow-hidden">
      <div className="night-sky" />
      <div className="dot-grid" />

      <AgentConstellation agents={agents} onSelectAgent={onSelectAgent} paused={!inView || chatOpen} scrollRef={scrollRef} />

      {/* copy column */}
      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="pointer-events-none relative z-20 h-full max-w-[1480px] mx-auto px-5 sm:px-8 flex flex-col pt-[88px] lg:pt-0 lg:justify-center"
      >
        <div className="max-w-[560px] [&>*]:pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="inline-flex items-center gap-2 h-8 pl-2 pr-3.5 rounded-full border border-line bg-white/[0.03] text-[12.5px] text-fg-2"
          >
            <span className="w-4 h-4 rounded-full source-gradient p-[2px]" aria-hidden>
              <span className="block w-full h-full rounded-full bg-ink" />
            </span>
            Powered by <span className="text-fg font-medium">Agnes 2.5 Pro</span>
          </motion.div>

          <h1 className="mt-5 lg:mt-7 font-display font-semibold text-fg tracking-[-0.035em] leading-[0.92] text-[clamp(44px,6.6vw,108px)]">
            {LINES.map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.07em] -mb-[0.07em]">
                <motion.span
                  className="block"
                  initial={{ y: '110%', rotate: 3 }}
                  animate={{ y: 0, rotate: 0 }}
                  transition={{ duration: 1.1, delay: 0.1 + i * 0.09, ease }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45, ease }}
            className="mt-5 lg:mt-7 text-fg-2 text-[15px] sm:text-[17px] leading-relaxed max-w-[44ch]"
          >
            Four specialists that search the live web, read sources, run code in a sandbox and call APIs. Use them right here, or run the
            whole stack on your own machine.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.55, ease }}
            className="mt-6 lg:mt-8 hidden sm:flex flex-wrap items-center gap-3"
          >
            <button
              onClick={onOpenRunLocally}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-fg text-ink text-[15px] font-semibold hover:bg-white transition-colors shadow-[0_10px_40px_-10px_rgba(196,177,255,0.6)]"
            >
              <Terminal className="w-4 h-4" />
              Run locally
            </button>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full border border-line bg-white/[0.03] text-[15px] font-medium text-fg hover:bg-white/[0.08] transition-colors"
            >
              <Github className="w-4 h-4 text-fg-2" />
              View source
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.6 }}
            className="mt-6 hidden lg:flex items-center gap-2 text-[13px] text-fg-3"
          >
            <MousePointerClick className="w-4 h-4" />
            Hover an agent to meet it. Click to start a chat.
          </motion.p>
        </div>
      </motion.div>

      {/* bottom rail */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 z-20">
        <div className="max-w-[1480px] mx-auto px-5 sm:px-8 pb-5 sm:pb-7 flex items-end justify-between">
          <a href="#capabilities" className="pointer-events-auto hidden sm:flex items-center gap-3 text-[12.5px] text-fg-3 hover:text-fg-2 transition-colors">
            <span className="scroll-cue" aria-hidden />
            Scroll to explore
          </a>
          <span className="hidden sm:flex items-center gap-2 text-[12.5px] text-fg-3">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
              <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            {agents.length} agents online
          </span>
        </div>
      </div>
    </section>
  );
};
