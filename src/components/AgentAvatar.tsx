import React from 'react';

interface AgentAvatarProps {
  type?: 'portfolio' | 'coder' | 'researcher' | 'forge' | 'custom' | string;
  avatarUrl?: string;
  accentColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isHovered?: boolean;
  /** Show the full-body render instead of the head portrait */
  full?: boolean;
  className?: string;
  alt?: string;
}

const BY_TYPE: Record<string, string> = {
  portfolio: 'plutus',
  coder: 'hephaestus',
  researcher: 'hermes',
  forge: 'proteus',
  custom: 'proteus',
};

const SIZES = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-16 h-16 sm:w-20 sm:h-20',
  lg: 'w-24 h-24 sm:w-28 sm:h-28',
  xl: 'w-36 h-36 sm:w-44 sm:h-44',
};

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  type = 'portfolio',
  avatarUrl,
  size = 'md',
  isHovered = false,
  full = false,
  className = '',
  alt = 'Agent avatar',
}) => {
  const name = BY_TYPE[type] || 'proteus';
  const head = avatarUrl || `/avatars/${name}.png`;
  const src = full ? `/avatars/${name}-full.png` : head;

  return (
    <div className={`relative flex items-center justify-center select-none ${SIZES[size]} ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-contain select-none transition-transform duration-300 ${isHovered ? 'scale-105' : 'scale-100'}`}
        loading="eager"
        draggable={false}
      />
    </div>
  );
};
