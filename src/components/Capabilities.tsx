import React, { useRef } from 'react';
import { useInView } from 'motion/react';
import { Search, Globe, Terminal, Plug, Coins, Cpu, ArrowUp } from 'lucide-react';
import { BRAND } from '../lib/palette';

const TOOLS = [
  {
    icon: Search,
    color: BRAND.volt,
    title: 'Web search',
    body: 'Finds current facts, prices and news, and cites where each one came from.',
    example: 'What changed in Node.js this week?',
  },
  {
    icon: Globe,
    color: BRAND.prism,
    title: 'Page reading',
    body: 'Opens a link or document and reads all of it, not just the snippet.',
    example: 'Summarise this whitepaper for me.',
  },
  {
    icon: Terminal,
    color: BRAND.ember,
    title: 'Code sandbox',
    body: 'Runs Python and bash in an isolated container, so the numbers are computed, not guessed.',
    example: 'Backtest a 20/50 moving-average cross.',
  },
  {
    icon: Plug,
    color: BRAND.gold,
    title: 'API calls',
    body: 'Queries public REST APIs directly, behind guardrails that block private networks.',
    example: 'Pull SOL from CoinGecko and compare to last week.',
  },
  {
    icon: Coins,
    color: BRAND.gold,
    title: 'x402 aware',
    body: 'Recognises pay-per-request APIs and tells you the exact price before anything is spent.',
    example: 'How much does this API charge per call?',
  },
  {
    icon: Cpu,
    color: BRAND.volt,
    title: 'Local models',
    body: 'Point it at Ollama, LM Studio or vLLM and every conversation stays on your machine.',
    example: 'LOCAL_MODEL_BASE_URL=http://localhost:11434/v1',
  },
];

/** A short replay of how one answer gets made: the same tool trail users see in chat. */
const TrailDemo: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const run = useInView(ref, { once: true, margin: '0px 0px -20% 0px' });

  const steps = [
    { icon: Search, color: BRAND.volt, label: 'Web search', detail: 'ethereum price today' },
    { icon: Terminal, color: BRAND.ember, label: 'Sandbox', detail: 'python3 -c "print(2500 / 2452.51)"' },
  ];

  return (
    <div
      ref={ref}
      className={`relative rounded-[28px] border border-line bg-ink-2/80 p-5 sm:p-6 overflow-hidden ${run ? 'trail-run' : ''}`}
      aria-label="Example of an agent answering with tools"
    >
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[radial-gradient(closest-side,rgba(157,123,255,0.28),rgba(61,214,245,0.08)_55%,transparent)]" aria-hidden />

      <div className="relative flex justify-end">
        <div className="trail-step max-w-[80%] rounded-[18px] rounded-tr-md bg-fg text-ink px-4 py-2.5 text-[14px]" style={{ animationDelay: '0.1s' }}>
          How much ETH can I buy with $2,500?
        </div>
      </div>

      <div className="relative mt-4 rounded-[18px] rounded-tl-md border border-line bg-ink/70 p-4">
        <div className="trail-step font-display text-[13px] font-semibold" style={{ color: BRAND.gold, animationDelay: '0.5s' }}>
          PLUTUS
        </div>
        <div className="mt-2.5 flex flex-col gap-2">
          {steps.map((s, i) => (
            <div key={s.label} className="trail-step flex items-center gap-2 min-w-0 text-[12.5px]" style={{ animationDelay: `${0.9 + i * 0.7}s` }}>
              <span className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${s.color}1f`, color: s.color }}>
                <s.icon className="w-3.5 h-3.5" />
              </span>
              <span className="text-fg-2 shrink-0">{s.label}</span>
              <span className="truncate font-mono text-[11.5px] text-fg-3">{s.detail}</span>
            </div>
          ))}
        </div>
        <p className="trail-step mt-3 text-[14.5px] text-fg leading-relaxed" style={{ animationDelay: '2.4s' }}>
          About <strong className="font-semibold">1.019 ETH</strong> at $2,452.51. Exchange fees and spread will shave a little off.
        </p>
      </div>

      <div className="relative mt-4 flex items-center gap-2 h-11 pl-4 pr-1.5 rounded-full border border-line bg-ink/60 text-[13.5px] text-fg-3">
        <span className="flex-1">Message PLUTUS…</span>
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-ink" style={{ background: BRAND.gold }} aria-hidden>
          <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
        </span>
      </div>
    </div>
  );
};

export const Capabilities: React.FC = () => (
  <section id="capabilities" className="relative scroll-mt-20 py-24 sm:py-36">
    <div className="max-w-[1480px] mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-12 lg:gap-16">
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-28">
          <h2 className="font-display font-semibold text-fg tracking-[-0.04em] leading-[0.95] text-[clamp(38px,4.6vw,72px)]">
            Tools,
            <br />
            not plugins.
          </h2>
          <p className="mt-5 text-fg-2 text-[16px] sm:text-[17px] leading-relaxed max-w-[42ch]">
            Every agent reaches for the same toolkit on its own, and you see each step it takes right in the chat.
          </p>
          <div className="mt-8 max-w-[520px]">
            <TrailDemo />
          </div>
        </div>
      </div>

      <ul className="lg:col-span-7 divide-y divide-[color:var(--color-line)] border-y border-line">
        {TOOLS.map((tool) => (
          <li key={tool.title} className="group grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-7 py-7 sm:py-9">
            <span
              className="mt-1 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105"
              style={{ background: `radial-gradient(circle at 30% 25%, ${tool.color}40, ${tool.color}12 70%)`, color: tool.color, boxShadow: `inset 0 0 0 1px ${tool.color}33` }}
            >
              <tool.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-[22px] sm:text-[28px] font-semibold tracking-[-0.025em] text-fg">{tool.title}</h3>
              <p className="mt-1.5 text-[15px] sm:text-[16px] text-fg-2 leading-relaxed max-w-[52ch]">{tool.body}</p>
              <p className="mt-3 inline-block max-w-full truncate rounded-lg bg-white/[0.035] border border-line px-3 py-1.5 font-mono text-[12px] text-fg-3">
                {tool.example}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
