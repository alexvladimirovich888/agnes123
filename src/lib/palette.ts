import type { AgentConfig } from '../types';

/**
 * SourceBots agent identities.
 * accent – the agent's signature colour (eyes, core, accessories)
 * glow   – brighter version used for light effects
 * text   – readable tint for text on the dark background
 * tint   – pastel used for the body shell
 */
export interface AgentPalette {
  accent: string;
  glow: string;
  text: string;
  tint: string;
  /** kept for the 2D fallback and older components */
  base: string;
  mid: string;
  light: string;
}

export type BotKind = 'plutus' | 'hephaestus' | 'hermes' | 'proteus';

export const PALETTES: Record<string, AgentPalette> = {
  portfolio: { accent: '#f2b544', glow: '#ffd27a', text: '#f7cf7f', tint: '#f3e7cf', base: '#b07d22', mid: '#d69a32', light: '#f2b544' },
  coder: { accent: '#ff6a3d', glow: '#ff9a6e', text: '#ff9c7a', tint: '#f4ddd3', base: '#b8431f', mid: '#e0552d', light: '#ff6a3d' },
  researcher: { accent: '#3dd6f5', glow: '#8ae9ff', text: '#86e3f7', tint: '#d6eef4', base: '#178aa3', mid: '#25b3d1', light: '#3dd6f5' },
  forge: { accent: '#9d7bff', glow: '#c4b1ff', text: '#bba6ff', tint: '#e3dcf7', base: '#5f43c7', mid: '#7d5df0', light: '#9d7bff' },
};

export const paletteFor = (agent: Pick<AgentConfig, 'avatarType'>): AgentPalette =>
  PALETTES[agent.avatarType] || PALETTES.forge;

const KIND_BY_TYPE: Record<string, BotKind> = {
  portfolio: 'plutus',
  coder: 'hephaestus',
  researcher: 'hermes',
  forge: 'proteus',
  custom: 'proteus',
};

export const botKindFor = (agent: Pick<AgentConfig, 'avatarType'>): BotKind => KIND_BY_TYPE[agent.avatarType] || 'proteus';

export const BRAND = {
  gold: '#f2b544',
  ember: '#ff6a3d',
  volt: '#3dd6f5',
  prism: '#9d7bff',
};
