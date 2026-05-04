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
  kind: 'core' | 'decision' | 'specialist' | 'resource' | 'hermes-coordinator' | 'tester' | 'marketing' | 'governance';
  /** Preferred model substrings for token-tracker / LM Studio routing */
  models: string[];
  /**
   * Scrum membership. Agents can belong to multiple teams (e.g. Fill chairs
   * the scrum-of-scrums; Kai joins both web-scrum and roblox-scrum as
   * cross-cutting infra). 'cross' = sits at the scrum-of-scrums layer.
   */
  teams?: ('cross' | 'scrum-roblox' | 'scrum-web' | 'scrum-marketing')[];
  /**
   * MCP tool ACL — names of tools the agent is allowed to call through the
   * virtualpc MCP server. Wildcards like 'codegraph.*' allowed. Read by the
   * MCP server on every tool invocation. Empty/undefined = no MCP access.
   */
  tools?: string[];
}

export const AGENT_META: AgentMeta[] = [
  // ─── Core 14 (existing roster) ────────────────────────────────────────
  { name: 'Fill',          role: 'CEO · Scrum-of-Scrums chair',       avatar: '👑', color: '#fbbf24', kind: 'core',       models: ['gemma-4-26b', 'claude-opus', 'qwen3.5-27b'], teams: ['cross', 'scrum-roblox', 'scrum-web', 'scrum-marketing'], tools: ['scrum.*', 'forum.read', 'codegraph.stats', 'governance.lineage', 'wiki.lookup'] },
  { name: 'Kai',           role: 'CTO · Cross-team infra',            avatar: '⚡', color: '#a78bfa', kind: 'core',       models: ['devstral', 'claude-opus', 'qwen3.5-27b'], teams: ['cross', 'scrum-roblox', 'scrum-web'], tools: ['codegraph.*', 'governance.lineage', 'assets.search', 'scrum.standup', 'scrum.bug', 'wiki.lookup'] },
  { name: 'Zip',           role: 'Developer',                          avatar: '💻', color: '#22c55e', kind: 'core',       models: ['devstral', 'claude-sonnet', 'phi-4'], teams: ['scrum-web'], tools: ['codegraph.*', 'wiki.lookup', 'assets.search'] },
  { name: 'Mira',          role: 'Creative Director',                  avatar: '🎨', color: '#ec4899', kind: 'core',       models: ['claude-sonnet', 'gemma-4-26b', 'phi-4'], teams: ['scrum-web', 'scrum-roblox'], tools: ['assets.search', 'wiki.lookup', 'governance.lineage'] },
  { name: 'Luna',          role: 'Tech Artist',                        avatar: '✨', color: '#06b6d4', kind: 'core',       models: ['claude-sonnet', 'devstral', 'deepseek-r1', 'phi-4'], teams: ['scrum-web'], tools: ['assets.search', 'codegraph.symbol', 'codegraph.file', 'wiki.lookup'] },
  { name: 'Cleopatra',     role: 'Executive Authority',                avatar: '👸', color: '#f97316', kind: 'decision',   models: ['qwen3.5-27b', 'claude-opus'], teams: ['cross'], tools: ['scrum.*', 'governance.*', 'forum.read'] },
  { name: 'Alexander',     role: 'Technical Arbiter',                  avatar: '🗡️', color: '#ef4444', kind: 'decision',   models: ['qwen3.5-27b', 'deepseek-r1'], teams: ['cross'], tools: ['codegraph.*', 'governance.lineage', 'scrum.bug'] },
  { name: 'MoneyGod',      role: 'Economy Authority',                  avatar: '💰', color: '#10b981', kind: 'decision',   models: ['qwen3.5-27b', 'claude-sonnet'], teams: ['cross', 'scrum-marketing'], tools: ['governance.lineage', 'wiki.lookup'] },
  { name: 'Analyst',       role: 'Data Analyst',                       avatar: '📊', color: '#8b5cf6', kind: 'resource',   models: ['gemma-4-26b', 'phi-4', 'claude-sonnet'], teams: ['scrum-marketing'], tools: ['governance.*', 'codegraph.stats', 'forum.read', 'wiki.lookup'] },
  { name: 'VideoProducer', role: 'Video Producer',                     avatar: '🎬', color: '#d946ef', kind: 'resource',   models: ['gemma-4-26b', 'phi-4'], teams: ['scrum-marketing'], tools: ['assets.search', 'wiki.lookup'] },
  { name: 'Vice',          role: 'Open-World Design Expert',           avatar: '🌆', color: '#e11d48', kind: 'specialist', models: ['gemma-4-26b', 'qwen3.5-27b'], teams: ['scrum-roblox', 'scrum-web'], tools: ['assets.search', 'wiki.lookup', 'governance.lineage'] },
  { name: 'Atlas',         role: 'Simulation / AR / VR / CAD Realism', avatar: '🥽', color: '#0ea5e9', kind: 'specialist', models: ['devstral', 'deepseek-r1'], teams: ['scrum-web'], tools: ['assets.search', 'codegraph.*', 'governance.lineage', 'wiki.lookup'] },
  { name: 'Kimi',          role: 'Long-Context Researcher · Docs author', avatar: '🌙', color: '#7c3aed', kind: 'specialist', models: ['kimi', 'moonshot', 'gemma-4-26b', 'qwen3.5-27b'], teams: ['cross'], tools: ['docs.*', 'wiki.*', 'codegraph.*', 'governance.lineage', 'assets.search', 'forum.read'] },
  { name: 'Croesus',       role: 'Commercialization Strategist',       avatar: '💎', color: '#fde047', kind: 'specialist', models: ['kimi', 'deepseek-r1', 'claude-sonnet'], teams: ['scrum-marketing'], tools: ['governance.lineage', 'wiki.lookup', 'forum.read'] },

  // ─── Data governance + Web developer (added 2026-05-04) ───────────────
  // Governor curates the data-governance registry: every shared/*.json file,
  // every wiki term, every asset license — owner, lineage, last-updated.
  // Pixel ships the webgame UI (Next.js/Phaser/Three.js) including the new
  // /wiki page that the data-governance registry feeds.
  { name: 'Governor',      role: 'Data Governance Analyst',           avatar: '📒', color: '#0891b2', kind: 'governance', models: ['phi-4', 'qwen3.5-27b', 'claude-sonnet'], teams: ['cross', 'scrum-marketing', 'scrum-web'], tools: ['governance.*', 'codegraph.*', 'assets.search', 'wiki.lookup', 'docs.regenerate'] },
  { name: 'Pixel',         role: 'Web Developer · Wiki + UX',          avatar: '🖼️', color: '#16a34a', kind: 'core',       models: ['devstral', 'claude-sonnet', 'phi-4'], teams: ['scrum-web'], tools: ['codegraph.*', 'wiki.*', 'assets.search', 'governance.lineage', 'docs.regenerate'] },

  // ─── 5 Hermes scrum coordinators (one per scrum + 2 cross-cutting) ────
  // Backed by the Hermes 3 + DeepSeek-R1 Reviewer pair on EDS2.
  // They run the daily standup, hold the burndown, escalate blockers.
  { name: 'Hermes-Roblox',   role: 'Scrum Master · Roblox team',       avatar: '🪽', color: '#fb923c', kind: 'hermes-coordinator', models: ['hermes-3', 'deepseek-r1'], teams: ['scrum-roblox'] },
  { name: 'Hermes-Web',      role: 'Scrum Master · Web team',          avatar: '🪽', color: '#22d3ee', kind: 'hermes-coordinator', models: ['hermes-3', 'deepseek-r1'], teams: ['scrum-web'] },
  { name: 'Hermes-Marketing',role: 'Scrum Master · Marketing & Perception', avatar: '🪽', color: '#facc15', kind: 'hermes-coordinator', models: ['hermes-3', 'deepseek-r1'], teams: ['scrum-marketing'] },
  { name: 'Hermes-Cross',    role: 'Scrum-of-Scrums coordinator',      avatar: '🪽', color: '#f472b6', kind: 'hermes-coordinator', models: ['hermes-3', 'deepseek-r1'], teams: ['cross'] },
  { name: 'Hermes-Reviewer', role: 'DeepSeek-R1 cross-team reviewer',  avatar: '🪽', color: '#a3e635', kind: 'hermes-coordinator', models: ['deepseek-r1', 'hermes-3'], teams: ['cross'] },

  // ─── Tester agents — synthetic users who play the games + file bugs ───
  // Roblox testers (4)
  { name: 'Tester-RB-Casey',   role: 'Casual Roblox player (10-13)',     avatar: '🎮', color: '#34d399', kind: 'tester', models: ['phi-4', 'gemma-4-26b'], teams: ['scrum-roblox'] },
  { name: 'Tester-RB-Riley',   role: 'Hardcore tycoon player (14-17)',   avatar: '🎮', color: '#10b981', kind: 'tester', models: ['phi-4', 'gemma-4-26b'], teams: ['scrum-roblox'] },
  { name: 'Tester-RB-Morgan',  role: 'Speedrunner / glitch-hunter',      avatar: '🎮', color: '#059669', kind: 'tester', models: ['phi-4', 'deepseek-r1'], teams: ['scrum-roblox'] },
  { name: 'Tester-RB-Avery',   role: 'Educator playing in classroom',    avatar: '🎮', color: '#047857', kind: 'tester', models: ['phi-4', 'claude-sonnet'], teams: ['scrum-roblox'] },
  // Web testers (4)
  { name: 'Tester-Web-Sam',    role: 'Mobile-first web player (Z Fold)', avatar: '🌐', color: '#60a5fa', kind: 'tester', models: ['phi-4', 'gemma-4-26b'], teams: ['scrum-web'] },
  { name: 'Tester-Web-Quinn',  role: 'Desktop browser player',           avatar: '🌐', color: '#3b82f6', kind: 'tester', models: ['phi-4', 'gemma-4-26b'], teams: ['scrum-web'] },
  { name: 'Tester-Web-Drew',   role: 'Accessibility tester (screen reader)', avatar: '🌐', color: '#2563eb', kind: 'tester', models: ['phi-4', 'claude-sonnet'], teams: ['scrum-web'] },
  { name: 'Tester-Web-Jordan', role: 'Chemistry teacher curriculum tester', avatar: '🌐', color: '#1d4ed8', kind: 'tester', models: ['phi-4', 'claude-sonnet'], teams: ['scrum-web'] },
  // Marketing/competitor playtest (2)
  { name: 'Tester-MK-Alex',    role: 'Plays competitor chemistry games', avatar: '🎯', color: '#eab308', kind: 'tester', models: ['phi-4', 'claude-sonnet'], teams: ['scrum-marketing'] },
  { name: 'Tester-MK-Robin',   role: 'TikTok / social-loop tester',      avatar: '🎯', color: '#ca8a04', kind: 'tester', models: ['phi-4', 'gemma-4-26b'], teams: ['scrum-marketing'] },
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
