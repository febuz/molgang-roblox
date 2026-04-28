"use strict";
/**
 * Agent Registry — single source of truth for the VirtualPC roster.
 *
 * Every module (task engine, token tracker, commits tracker, social hub, UI)
 * imports from here so there can be no drift where "All Agents" shows 12 but
 * Token Usage only shows 5. Adding a new agent = editing this file once.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_MODELS = exports.COLOR_MAP = exports.AVATAR_MAP = exports.ROLE_MAP = exports.AGENT_NAMES = exports.AGENT_META = void 0;
exports.getAgent = getAgent;
exports.AGENT_META = [
    { name: 'Fill', role: 'CEO', avatar: '👑', color: '#fbbf24', kind: 'core', models: ['gemma-4-26b', 'claude-opus', 'qwen3.5-27b'] },
    { name: 'Kai', role: 'CTO', avatar: '⚡', color: '#a78bfa', kind: 'core', models: ['devstral', 'claude-opus', 'qwen3.5-27b'] },
    { name: 'Zip', role: 'Developer', avatar: '💻', color: '#22c55e', kind: 'core', models: ['devstral', 'claude-sonnet', 'phi-4'] },
    { name: 'Mira', role: 'Creative Director', avatar: '🎨', color: '#ec4899', kind: 'core', models: ['gemma-4-26b', 'claude-sonnet', 'phi-4'] },
    { name: 'Luna', role: 'Tech Artist', avatar: '✨', color: '#06b6d4', kind: 'core', models: ['devstral', 'deepseek-r1', 'phi-4'] },
    { name: 'Cleopatra', role: 'Executive Authority', avatar: '👸', color: '#f97316', kind: 'decision', models: ['qwen3.5-27b', 'claude-opus'] },
    { name: 'Alexander', role: 'Technical Arbiter', avatar: '🗡️', color: '#ef4444', kind: 'decision', models: ['qwen3.5-27b', 'deepseek-r1'] },
    { name: 'MoneyGod', role: 'Economy Authority', avatar: '💰', color: '#10b981', kind: 'decision', models: ['qwen3.5-27b', 'claude-sonnet'] },
    { name: 'Analyst', role: 'Data Analyst', avatar: '📊', color: '#8b5cf6', kind: 'resource', models: ['gemma-4-26b', 'phi-4', 'claude-sonnet'] },
    { name: 'VideoProducer', role: 'Video Producer', avatar: '🎬', color: '#d946ef', kind: 'resource', models: ['gemma-4-26b', 'phi-4'] },
    { name: 'Vice', role: 'Open-World Design Expert', avatar: '🌆', color: '#e11d48', kind: 'specialist', models: ['gemma-4-26b', 'qwen3.5-27b'] },
    { name: 'Atlas', role: 'Simulation / AR / VR / CAD Realism', avatar: '🥽', color: '#0ea5e9', kind: 'specialist', models: ['devstral', 'deepseek-r1'] },
    { name: 'Kimi', role: 'Long-Context Researcher', avatar: '🌙', color: '#7c3aed', kind: 'specialist', models: ['kimi', 'moonshot', 'gemma-4-26b', 'qwen3.5-27b'] },
    // Commercialization strategist. Files PROPOSALS only — never spends money
    // directly. See src/commercialization.ts for the budget-bounded approval
    // queue and the REAL_MONEY=0 default that keeps everything dry-run.
    { name: 'Croesus', role: 'Commercialization Strategist', avatar: '💎', color: '#fde047', kind: 'specialist', models: ['kimi', 'deepseek-r1', 'claude-sonnet'] },
];
/** Canonical list of agent names — use this everywhere you need to iterate. */
exports.AGENT_NAMES = exports.AGENT_META.map(a => a.name);
/** Lookup by name (returns undefined if missing). */
function getAgent(name) {
    return exports.AGENT_META.find(a => a.name === name);
}
/** roleMap compatibility: { Fill: 'CEO', Kai: 'CTO', ... } */
exports.ROLE_MAP = Object.fromEntries(exports.AGENT_META.map(a => [a.name, a.role]));
/** avatarMap compatibility */
exports.AVATAR_MAP = Object.fromEntries(exports.AGENT_META.map(a => [a.name, a.avatar]));
/** colorMap compatibility */
exports.COLOR_MAP = Object.fromEntries(exports.AGENT_META.map(a => [a.name, a.color]));
/** Agent → preferred models for token tracker / routing */
exports.AGENT_MODELS = Object.fromEntries(exports.AGENT_META.map(a => [a.name, a.models]));
//# sourceMappingURL=agent-registry.js.map