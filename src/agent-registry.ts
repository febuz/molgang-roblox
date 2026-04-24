/**
 * Agent Registry — single source of truth for the VirtualPC roster.
 *
 * Every module (task engine, token tracker, commits tracker, social hub, UI)
 * imports from here so there can be no drift where "All Agents" shows 12 but
 * Token Usage only shows 5. Adding a new agent = editing this file once.
 */

export interface AgentMeta {
  name: string;
  role: string;
  avatar: string;
  color: string;
  kind: 'core' | 'decision' | 'specialist' | 'resource';
  /** Preferred model substrings for token-tracker / LM Studio routing */
  models: string[];
}

export const AGENT_META: AgentMeta[] = [
  { name: 'Fill',          role: 'CEO',                              avatar: '👑', color: '#fbbf24', kind: 'core',       models: ['gemma-4-26b', 'claude-opus', 'qwen3.5-27b'] },
  { name: 'Kai',           role: 'CTO',                              avatar: '⚡', color: '#a78bfa', kind: 'core',       models: ['devstral', 'claude-opus', 'qwen3.5-27b'] },
  { name: 'Zip',           role: 'Developer',                        avatar: '💻', color: '#22c55e', kind: 'core',       models: ['devstral', 'claude-sonnet', 'phi-4'] },
  { name: 'Mira',          role: 'Creative Director',                avatar: '🎨', color: '#ec4899', kind: 'core',       models: ['gemma-4-26b', 'claude-sonnet', 'phi-4'] },
  { name: 'Luna',          role: 'Tech Artist',                      avatar: '✨', color: '#06b6d4', kind: 'core',       models: ['devstral', 'deepseek-r1', 'phi-4'] },
  { name: 'Cleopatra',     role: 'Executive Authority',              avatar: '👸', color: '#f97316', kind: 'decision',   models: ['qwen3.5-27b', 'claude-opus'] },
  { name: 'Alexander',     role: 'Technical Arbiter',                avatar: '🗡️', color: '#ef4444', kind: 'decision',   models: ['qwen3.5-27b', 'deepseek-r1'] },
  { name: 'MoneyGod',      role: 'Economy Authority',                avatar: '💰', color: '#10b981', kind: 'decision',   models: ['qwen3.5-27b', 'claude-sonnet'] },
  { name: 'Analyst',       role: 'Data Analyst',                     avatar: '📊', color: '#8b5cf6', kind: 'resource',   models: ['gemma-4-26b', 'phi-4', 'claude-sonnet'] },
  { name: 'VideoProducer', role: 'Video Producer',                   avatar: '🎬', color: '#d946ef', kind: 'resource',   models: ['gemma-4-26b', 'phi-4'] },
  { name: 'Vice',          role: 'Open-World Design Expert',         avatar: '🌆', color: '#e11d48', kind: 'specialist', models: ['gemma-4-26b', 'qwen3.5-27b'] },
  { name: 'Atlas',         role: 'Simulation / AR / VR / CAD Realism', avatar: '🥽', color: '#0ea5e9', kind: 'specialist', models: ['devstral', 'deepseek-r1'] },
];

/** Canonical list of agent names — use this everywhere you need to iterate. */
export const AGENT_NAMES: string[] = AGENT_META.map(a => a.name);

/** Lookup by name (returns undefined if missing). */
export function getAgent(name: string): AgentMeta | undefined {
  return AGENT_META.find(a => a.name === name);
}

/** roleMap compatibility: { Fill: 'CEO', Kai: 'CTO', ... } */
export const ROLE_MAP: { [name: string]: string } = Object.fromEntries(
  AGENT_META.map(a => [a.name, a.role])
);

/** avatarMap compatibility */
export const AVATAR_MAP: { [name: string]: string } = Object.fromEntries(
  AGENT_META.map(a => [a.name, a.avatar])
);

/** colorMap compatibility */
export const COLOR_MAP: { [name: string]: string } = Object.fromEntries(
  AGENT_META.map(a => [a.name, a.color])
);

/** Agent → preferred models for token tracker / routing */
export const AGENT_MODELS: { [name: string]: string[] } = Object.fromEntries(
  AGENT_META.map(a => [a.name, a.models])
);
