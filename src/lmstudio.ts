/**
 * LM Studio agent-inference backend.
 *
 * Thin wrapper around the OpenAI-compatible API at http://127.0.0.1:1234/v1.
 * Per-agent model routing lets us send chat tasks to Gemma 4 26B, code tasks
 * to Devstral 24B, arbitration to Qwen 3.5 27B, cheap tasks to Phi-4,
 * reasoning to DeepSeek R1 Qwen3-8B. Model list matches what's on EDS2.
 *
 * Graceful degradation: if the server is down or the model isn't loaded,
 * endpoints return a structured error the UI can display rather than 500'ing.
 */

import logger from './utils/logger';

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1';

// Per-agent / per-task-type model routing. Keys are agent names from the roster.
// Right-hand side is a substring that must appear in the LM Studio model id.
const AGENT_MODEL_ROUTES: { [agent: string]: string } = {
  // Core 5
  Fill:        'gemma-4-26b',     // executive chat
  Kai:         'devstral',        // code-heavy
  Zip:         'devstral',        // code-heavy
  Mira:        'gemma-4-26b',     // visual concept articulation
  Luna:        'devstral',        // shader + renderer code
  // Decision makers
  Cleopatra:   'qwen3.5-27b',     // arbitration / reasoning
  Alexander:   'qwen3.5-27b',     // arbitration / reasoning
  MoneyGod:    'qwen3.5-27b',     // economic reasoning
  // Resource-heavy
  Analyst:     'gemma-4-26b',     // explanatory writing + code snippets
  VideoProducer: 'gemma-4-26b',   // storyboarding / script
  // Specialists
  Vice:        'gemma-4-26b',     // screenplay / narrative
  Atlas:       'devstral',        // CAD / physics code
};

const TASK_TYPE_ROUTES: { [kind: string]: string } = {
  chat:         'gemma-4-26b',
  code:         'devstral',
  arbitration:  'qwen3.5-27b',
  reasoning:    'deepseek-r1',
  cheap:        'phi-4',
  embedding:    'nomic-embed',
};

interface LmModel {
  id: string;
  object: string;
  owned_by?: string;
}

interface LmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LmChatRequest {
  model?: string;
  messages: LmChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: false;
}

interface LmChatResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

let cachedModels: { at: number; models: LmModel[] } | null = null;
const MODEL_CACHE_MS = 15_000;

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 5000): Promise<T> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    if (!r.ok) throw new Error(`LM Studio ${r.status}: ${await r.text()}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(to);
  }
}

export async function getModels(force = false): Promise<LmModel[]> {
  if (!force && cachedModels && Date.now() - cachedModels.at < MODEL_CACHE_MS) {
    return cachedModels.models;
  }
  try {
    const r = await fetchJson<{ data: LmModel[] }>(`${LM_STUDIO_URL}/models`, undefined, 3000);
    cachedModels = { at: Date.now(), models: r.data || [] };
    return cachedModels.models;
  } catch (e: any) {
    logger.warn(`LM Studio unreachable: ${e.message}`);
    return [];
  }
}

export async function healthCheck(): Promise<{
  reachable: boolean;
  url: string;
  modelsLoaded: number;
  models: string[];
  error?: string;
}> {
  try {
    const models = await getModels(true);
    return {
      reachable: true,
      url: LM_STUDIO_URL,
      modelsLoaded: models.length,
      models: models.map(m => m.id),
    };
  } catch (e: any) {
    return {
      reachable: false,
      url: LM_STUDIO_URL,
      modelsLoaded: 0,
      models: [],
      error: e.message,
    };
  }
}

/** Pick the loaded model whose id contains the given substring. First match wins. */
async function resolveModel(hint: string): Promise<string | null> {
  const models = await getModels();
  const lower = hint.toLowerCase();
  const match = models.find(m => m.id.toLowerCase().includes(lower));
  if (match) return match.id;
  // Prefer smaller/faster model chain: phi-4 -> deepseek-r1 -> devstral -> anything non-embed
  const preferredFallback = ['phi-4', 'deepseek-r1', 'devstral', 'gemma', 'qwen'];
  for (const p of preferredFallback) {
    const found = models.find(m => m.id.toLowerCase().includes(p));
    if (found) return found.id;
  }
  const fallback = models.find(m => !/embed/i.test(m.id));
  return fallback?.id || null;
}

export async function chatAsAgent(
  agent: string,
  messages: LmChatMessage[],
  opts: { temperature?: number; max_tokens?: number; taskType?: keyof typeof TASK_TYPE_ROUTES } = {}
): Promise<{ ok: true; model: string; agent: string; content: string; usage: any; latencyMs: number }
         | { ok: false; reason: string; hint?: string }> {
  const hint = opts.taskType
    ? (TASK_TYPE_ROUTES[opts.taskType] || AGENT_MODEL_ROUTES[agent] || 'gemma-4-26b')
    : (AGENT_MODEL_ROUTES[agent] || 'gemma-4-26b');

  const model = await resolveModel(hint);
  if (!model) {
    const health = await healthCheck();
    if (!health.reachable) {
      return {
        ok: false,
        reason: 'LM Studio server unreachable',
        hint: 'Start with:  lms server start    and load a model:  lms load google/gemma-4-26b-a4b',
      };
    }
    return {
      ok: false,
      reason: `No model loaded matching "${hint}"`,
      hint: `Loaded models: ${health.models.join(', ') || '(none)'}. Run: lms load ${hint}`,
    };
  }

  const started = Date.now();
  try {
    const req: LmChatRequest = {
      model,
      messages,
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.max_tokens ?? 512,
      stream: false,
    };
    const r = await fetchJson<LmChatResponse>(
      `${LM_STUDIO_URL}/chat/completions`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) },
      60_000
    );
    return {
      ok: true,
      model,
      agent,
      content: r.choices[0]?.message?.content || '',
      usage: r.usage || null,
      latencyMs: Date.now() - started,
    };
  } catch (e: any) {
    return { ok: false, reason: e.message, hint: 'Check `lms server status` and `lms ps`' };
  }
}

/** Build a system prompt that grounds the agent in their VirtualPC role. */
export function systemPromptForAgent(agent: string, role: string, context?: string): string {
  return [
    `You are ${agent}, ${role}, working inside the VirtualPC agent system that is building the MOLGANG Chemical Engineering Simulator.`,
    `Respond in character. Keep answers grounded in VirtualPC context. Be concise unless asked to expand.`,
    context ? `\nCurrent context:\n${context}` : '',
  ].filter(Boolean).join('\n');
}
