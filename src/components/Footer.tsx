import React from 'react';
import { REPO_URL, X_URL } from '../lib/links';
import { LogoMark } from './Logo';

export const Footer: React.FC<{ onOpenRunLocally: () => void }> = ({ onOpenRunLocally }) => (
  <footer className="relative overflow-hidden border-t border-line">
    <div className="max-w-[1480px] mx-auto px-5 sm:px-8 pt-14 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LogoMark size={40} alive />
          <div>
            <div className="font-display text-[18px] font-semibold tracking-[-0.02em] text-fg">SourceBots</div>
            <div className="text-[13px] text-fg-3">Open source under the MIT license.</div>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-[14px]" aria-label="Footer">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="h-9 px-3.5 inline-flex items-center rounded-full text-fg-2 hover:text-fg hover:bg-white/[0.05] transition-colors">
            GitHub
          </a>
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="h-9 px-3.5 inline-flex items-center rounded-full text-fg-2 hover:text-fg hover:bg-white/[0.05] transition-colors">
            X (Twitter)
          </a>
          <button onClick={onOpenRunLocally} className="h-9 px-3.5 inline-flex items-center rounded-full text-fg-2 hover:text-fg hover:bg-white/[0.05] transition-colors">
            Run locally
          </button>
        </nav>
      </div>
    </div>

    {/* oversized wordmark, cropped by the page edge */}
    <div className="relative select-none pointer-events-none" aria-hidden>
      <div className="font-display font-bold tracking-[-0.06em] leading-[0.78] text-center text-[clamp(72px,19vw,320px)] translate-y-[18%] bg-[linear-gradient(180deg,rgba(244,243,250,0.1),rgba(244,243,250,0))] bg-clip-text text-transparent">
        SourceBots
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px source-gradient opacity-60" />
    </div>
  </footer>
);
