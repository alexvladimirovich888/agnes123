import React, { useEffect, useId, useState } from 'react';
import { BRAND } from '../lib/palette';

interface LogoMarkProps {
  size?: number;
  className?: string;
  /** Blink the eyes every few seconds (respects reduced motion). */
  alive?: boolean;
}

/**
 * The SourceBots mark: a bot face inside a "source" ring made of the four agents' colours.
 * Pure SVG so it stays crisp at every size and can blink.
 */
export const LogoMark: React.FC<LogoMarkProps> = ({ size = 32, className = '', alive = false }) => {
  const id = useId().replace(/:/g, '');
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!alive) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 140);
        loop();
      }, 2600 + Math.random() * 3200);
    };
    loop();
    return () => window.clearTimeout(t);
  }, [alive]);

  // Four arcs of the ring, each ~72° with gaps, starting top-left
  const arcs = [
    { c: BRAND.volt, a0: -150, a1: -78 },
    { c: BRAND.gold, a0: -60, a1: 12 },
    { c: BRAND.ember, a0: 30, a1: 102 },
    { c: BRAND.prism, a0: 120, a1: 192 },
  ];
  const R = 52;
  const pt = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return [64 + R * Math.cos(r), 64 + R * Math.sin(r)];
  };

  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden>
      <defs>
        <radialGradient id={`shell-${id}`} cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e9ebf3" />
          <stop offset="1" stopColor="#b9bdcc" />
        </radialGradient>
        <linearGradient id={`visor-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1d33" />
          <stop offset="1" stopColor="#07080f" />
        </linearGradient>
        <linearGradient id={`eye-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bff4ff" />
          <stop offset="1" stopColor={BRAND.volt} />
        </linearGradient>
      </defs>

      {arcs.map(({ c, a0, a1 }) => {
        const [x0, y0] = pt(a0);
        const [x1, y1] = pt(a1);
        return <path key={c} d={`M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}`} fill="none" stroke={c} strokeWidth="11" strokeLinecap="round" />;
      })}

      <circle cx="64" cy="64" r="35" fill={`url(#shell-${id})`} />
      <rect x="39" y="48" width="50" height="28" rx="14" fill={`url(#visor-${id})`} />
      <g style={{ transformOrigin: '64px 62px', transform: blink ? 'scaleY(0.12)' : 'scaleY(1)', transition: 'transform 90ms ease' }}>
        <rect x="51" y="54" width="7" height="14" rx="3.5" fill={`url(#eye-${id})`} />
        <rect x="70" y="54" width="7" height="14" rx="3.5" fill={`url(#eye-${id})`} />
      </g>
    </svg>
  );
};

export const Wordmark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`font-display font-semibold tracking-[-0.03em] leading-none ${className}`}>
    Source<span className="text-fg-2 font-medium">Bots</span>
  </span>
);
