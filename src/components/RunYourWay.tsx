import React, { useState } from 'react';
import { Github, BookOpen, Copy, Check } from 'lucide-react';
import type { AgentConfig } from '../types';
import { paletteFor } from '../lib/palette';
import { REPO_URL } from '../lib/links';
const botFile = (t: string) => ({ portfolio: 'plutus', coder: 'hephaestus', researcher: 'hermes' } as Record<string, string>)[t] || 'proteus';

interface RunYourWayProps {
  agents: AgentConfig[];
  onSelectAgent: (agent: AgentConfig) => void;
  onOpenRunLocally: () => void;
}

export const RunYourWay: React.FC<RunYourWayProps> = ({ agents, onSelectAgent, onOpenRunLocally }) => {
  const [copied, setCopied] = useState(false);
  const snippet = `git clone ${REPO_URL}.git sourcebots\ncd sourcebots && npm ci\nnpm run dev`;

  return (
    <section id="run" className="relative scroll-mt-20 pb-24 sm:pb-36">
      <div className="max-w-[1480px] mx-auto px-5 sm:px-8">
        <h2 className="font-display font-semibold text-fg tracking-[-0.04em] leading-[0.95] text-[clamp(38px,4.6vw,72px)]">Run it your way.</h2>
        <p className="mt-5 text-fg-2 text-[16px] sm:text-[17px] leading-relaxed max-w-[52ch]">
          Same agents, same tools. Talk to them in the browser, or host the whole stack yourself with a hosted model or an open-weight one.
        </p>

        <div className="mt-10 sm:mt-14 grid lg:grid-cols-2 gap-4 sm:gap-5">
          {/* browser */}
          <article className="relative overflow-hidden rounded-[32px] border border-line bg-ink-2 p-6 sm:p-10 flex flex-col">
            <div className="absolute -bottom-40 -left-20 w-[420px] h-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(61,214,245,0.18),transparent)]" aria-hidden />
            <h3 className="relative font-display text-[28px] sm:text-[36px] font-semibold tracking-[-0.03em] text-fg">In your browser</h3>
            <p className="relative mt-2 text-[15.5px] text-fg-2 leading-relaxed max-w-[40ch]">Nothing to install. Pick an agent and give it a task.</p>
            <div className="relative mt-8 sm:mt-auto pt-0 sm:pt-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {agents.map((agent) => {
                const pal = paletteFor(agent);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => onSelectAgent(agent)}
                    className="group relative flex flex-col items-center pt-4 pb-3.5 px-2 rounded-[22px] border border-line bg-ink/60 hover:bg-ink-3 text-center transition-colors overflow-hidden"
                  >
                    <span
                      className="absolute inset-x-0 bottom-0 h-2/3 opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `radial-gradient(60% 70% at 50% 100%, ${pal.accent}40, transparent)` }}
                      aria-hidden
                    />
                    <img
                      src={`/avatars/${botFile(agent.avatarType)}-full.png`}
                      alt=""
                      className="relative h-28 sm:h-32 w-auto object-contain transition-transform duration-500 group-hover:-translate-y-1.5"
                      draggable={false}
                    />
                    <span className="relative mt-2 font-display text-[15px] font-semibold text-fg">{agent.name}</span>
                    <span className="relative text-[11.5px] text-fg-3 leading-tight">{agent.role.replace(' Agent', '')}</span>
                  </button>
                );
              })}
            </div>
          </article>

          {/* local */}
          <article className="relative overflow-hidden rounded-[32px] border border-line bg-ink-2 p-6 sm:p-10 flex flex-col">
            <div className="absolute -top-40 -right-20 w-[420px] h-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(255,106,61,0.16),transparent)]" aria-hidden />
            <h3 className="relative font-display text-[28px] sm:text-[36px] font-semibold tracking-[-0.03em] text-fg">On your machine</h3>
            <p className="relative mt-2 text-[15.5px] text-fg-2 leading-relaxed max-w-[44ch]">
              Clone the repo, add a key or point it at Ollama, and start. Node.js and Docker both work.
            </p>

            <div className="relative mt-8 rounded-2xl border border-line bg-[#07070f] overflow-hidden">
              <pre className="pl-4 pr-12 py-4 font-mono text-[12.5px] sm:text-[13px] leading-relaxed text-fg/90 overflow-x-auto">
                <code>
                  {snippet.split('\n').map((l) => (
                    <span key={l} className="block">
                      <span className="select-none text-fg-3 mr-3">$</span>
                      {l}
                    </span>
                  ))}
                </code>
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(snippet);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
                className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg flex items-center justify-center text-fg-3 hover:text-fg hover:bg-white/[0.07] transition-colors"
                aria-label="Copy commands"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative mt-6 flex flex-wrap gap-2.5">
              <button
                onClick={onOpenRunLocally}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-fg text-ink text-[14px] font-semibold hover:bg-white transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Full setup guide
              </button>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-line bg-white/[0.03] text-[14px] font-medium text-fg hover:bg-white/[0.08] transition-colors"
              >
                <Github className="w-4 h-4 text-fg-2" />
                View source
              </a>
            </div>
            <p className="relative mt-auto pt-8 text-[13px] text-fg-3">Works with Ollama, LM Studio, vLLM, llama.cpp and Docker.</p>
          </article>
        </div>
      </div>
    </section>
  );
};
