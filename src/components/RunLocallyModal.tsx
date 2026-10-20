import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Terminal, Copy, Check, HardDrive, Cpu, ShieldCheck, Github, Twitter } from 'lucide-react';

interface RunLocallyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RunLocallyModal: React.FC<RunLocallyModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const cliCommand = `# Install OpenBots CLI & Agent Engine
curl -fsSL https://get.openbots-ai.dev/install.sh | bash

# Run OpenBots locally with Agnes 2.5 Pro acceleration
openbots run agnes-2.5-pro --port 8080 --tools all`;

  const dockerCommand = `# Pull and run official OpenBots container
docker run -d --gpus all -p 8080:8080 \\
  -v ~/.openbots/weights:/models \\
  ghcr.io/openbots-ai/agnes-2.5-pro:latest`;

  const XIcon = ({ className = '' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.75 3h3.07l-6.71 7.67L22 21h-6.18l-4.84-6.33L5.44 21H2.37l7.18-8.2L2 3h6.33l4.38 5.79L17.75 3Zm-1.08 16.17h1.7L7.4 4.73H5.58l11.09 14.44Z" />
    </svg>
  );

  const CodeBlock = ({ id, title, code, icon }: { id: string; title: string; code: string; icon: React.ReactNode }) => (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0a0b0e] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <span className="flex items-center gap-2 text-[13px] text-fg font-medium">
          {icon}
          {title}
        </span>
        <button
          onClick={() => copyText(code, id)}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] text-fg-2 hover:text-fg hover:bg-white/[0.06] transition-colors"
        >
          {copiedSection === id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedSection === id ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 font-mono text-[12.5px] text-fg/85 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Run OpenBots locally"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="relative w-full max-w-2xl rounded-[28px] bg-ink border border-white/[0.08] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] p-5 sm:p-8 z-10 overflow-hidden"
          >
            <div
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[260px] pointer-events-none opacity-70"
              style={{
                background:
                  'radial-gradient(closest-side, rgba(97,165,53,0.16), transparent), radial-gradient(closest-side at 70% 50%, rgba(61,126,170,0.18), transparent), radial-gradient(closest-side at 30% 60%, rgba(204,117,117,0.14), transparent)',
              }}
            />

            <div className="relative flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3.5">
                <img src="/brand/logo-mark-128.png" alt="" className="w-11 h-11" />
                <div>
                  <h3 className="font-display text-[20px] sm:text-[22px] font-medium tracking-[-0.02em] text-fg">Run OpenBots locally</h3>
                  <p className="text-[13px] text-fg-2 mt-0.5">Agnes 2.5 Pro on your own hardware. Zero telemetry.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] text-fg-2 hover:text-fg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative space-y-3">
              <CodeBlock id="cli" title="Quick install (Linux, macOS, WSL)" code={cliCommand} icon={<Terminal className="w-4 h-4 text-fg-2" />} />
              <CodeBlock id="docker" title="Production Docker runtime" code={dockerCommand} icon={<HardDrive className="w-4 h-4 text-fg-2" />} />

              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.07]">
                {[
                  { k: 'Minimum hardware', v: '16GB RAM / Apple Silicon', icon: <Cpu className="w-4 h-4" /> },
                  { k: 'Optimal GPU', v: 'NVIDIA RTX 4090 / A100', icon: <HardDrive className="w-4 h-4" /> },
                  { k: 'Quantization', v: '4-bit / 8-bit / BF16 Native', icon: <ShieldCheck className="w-4 h-4" /> },
                ].map((s) => (
                  <div key={s.k} className="bg-ink-2 px-4 py-3.5">
                    <dt className="flex items-center gap-1.5 text-[12px] text-fg-3">
                      {s.icon}
                      {s.k}
                    </dt>
                    <dd className="mt-1 text-[13.5px] font-medium text-fg">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-[13px] text-fg-2 hover:text-fg hover:bg-white/[0.06] transition-colors"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-[13px] text-fg-2 hover:text-fg hover:bg-white/[0.06] transition-colors"
                >
                  <XIcon className="w-3.5 h-3.5" />
                  X (Twitter)
                </a>
              </div>
              <button
                onClick={onClose}
                className="h-10 px-5 rounded-full bg-fg text-ink text-[13.5px] font-semibold hover:bg-white transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
