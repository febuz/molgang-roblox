"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModels = getModels;
exports.healthCheck = healthCheck;
exports.chatAsAgent = chatAsAgent;
exports.systemPromptForAgent = systemPromptForAgent;
const logger_1 = __importDefault(require("./utils/logger"));
// Prefer LiteLLM unified gateway when running. LiteLLM exposes the
// OpenAI-compatible /v1 surface and routes to local LM Studio + every
// configured cloud provider in one place. Falls back to direct LM Studio
// when LITELLM_URL is unset.
const LITELLM_URL = process.env.LITELLM_URL || '';
const LM_STUDIO_URL = LITELLM_URL || process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1';
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY || 'sk-virtualpc-dev';
// Per-agent / per-task-type model routing. Keys are agent names from the roster.
// Right-hand side is a substring that must appear in the LM Studio model id.
//
// Policy: default to SMALL/FAST models (phi-4, devstral-small, deepseek-r1-8b)
// that fit alongside Blender + the OS on the RTX 3090s. The big 26B+ models
// (gemma-4-26b, qwen3.5-27b) are only picked when the user explicitly requests
// taskType: 'deep' — this stops "load cancelled" failures like Vice was hitting
// when two requests raced to load Gemma 26B.
const AGENT_MODEL_ROUTES = {
    // Core 5
    Fill: 'phi-4', // executive chat
    Kai: 'devstral', // code-heavy
    Zip: 'devstral', // code-heavy
    Mira: 'phi-4', // visual concept articulation
    Luna: 'devstral', // shader + renderer code
    // Decision makers — need reasoning but keep default fast; deep work via taskType
    Cleopatra: 'deepseek-r1',
    Alexander: 'deepseek-r1',
    MoneyGod: 'deepseek-r1',
    // Resource-heavy
    Analyst: 'phi-4', // narrative + code snippets
    VideoProducer: 'phi-4', // storyboarding / script
    // Specialists
    Vice: 'phi-4', // screenplay / narrative (NOT gemma 26b by default)
    Atlas: 'devstral', // CAD / physics code
    Kimi: 'phi-4', // local fallback; routes to Moonshot Kimi via kimi-client when MOONSHOT_API_KEY is set
};
const TASK_TYPE_ROUTES = {
    chat: 'phi-4', // default chat goes to Phi-4 (fast, loaded)
    code: 'devstral',
    arbitration: 'deepseek-r1', // reasoning model, smaller than qwen-27b
    reasoning: 'deepseek-r1',
    cheap: 'phi-4',
    embedding: 'nomic-embed',
    // Explicit opt-in for the heavy models, used by tasks that genuinely need
    // long-context or larger capacity (governance audits, lengthy screenplays).
    deep: 'qwen3.5-27b',
    concept: 'gemma-4-26b',
};
let cachedModels = null;
const MODEL_CACHE_MS = 15000;
async function fetchJson(url, init, timeoutMs = 5000) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    // When routing through LiteLLM, attach the master key as a Bearer token.
    const headers = { ...init?.headers };
    if (LITELLM_URL && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${LITELLM_MASTER_KEY}`;
    }
    try {
        const r = await fetch(url, { ...init, headers, signal: ctrl.signal });
        if (!r.ok) {
            const provider = LITELLM_URL ? 'LiteLLM' : 'LM Studio';
            throw new Error(`${provider} ${r.status}: ${await r.text()}`);
        }
        return (await r.json());
    }
    finally {
        clearTimeout(to);
    }
}
async function getModels(force = false) {
    if (!force && cachedModels && Date.now() - cachedModels.at < MODEL_CACHE_MS) {
        return cachedModels.models;
    }
    try {
        const r = await fetchJson(`${LM_STUDIO_URL}/models`, undefined, 3000);
        cachedModels = { at: Date.now(), models: r.data || [] };
        return cachedModels.models;
    }
    catch (e) {
        logger_1.default.warn(`LM Studio unreachable: ${e.message}`);
        return [];
    }
}
async function healthCheck() {
    const gateway = LITELLM_URL ? 'litellm' : 'lm-studio';
    try {
        const models = await getModels(true);
        return {
            reachable: true,
            gateway,
            url: LM_STUDIO_URL,
            modelsLoaded: models.length,
            models: models.map(m => m.id),
        };
    }
    catch (e) {
        return {
            reachable: false,
            gateway,
            url: LM_STUDIO_URL,
            modelsLoaded: 0,
            models: [],
            error: e.message,
        };
    }
}
/** Pick the best currently-available model. Never triggers an on-demand load
 *  of a heavy model (which can cancel under memory pressure and fail chat).
 *  Priority: hint-substring match → fast-model fallback chain → any non-embed.
 */
async function resolveModel(hint) {
    const models = await getModels();
    if (models.length === 0)
        return null;
    const lower = hint.toLowerCase();
    const match = models.find(m => m.id.toLowerCase().includes(lower));
    if (match)
        return match.id;
    // Prefer smaller/faster model chain (lowest VRAM footprint first) so a chat
    // request doesn't try to load the 18 GB Gemma 26B when Phi-4 is already warm.
    const preferredFallback = ['phi-4', 'deepseek-r1', 'devstral', 'gemma', 'qwen'];
    for (const p of preferredFallback) {
        const found = models.find(m => m.id.toLowerCase().includes(p));
        if (found)
            return found.id;
    }
    const fallback = models.find(m => !/embed/i.test(m.id));
    return fallback?.id || null;
}
async function chatAsAgent(agent, messages, opts = {}) {
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
    const attemptChat = async (useModel) => {
        const req = {
            model: useModel,
            messages,
            temperature: opts.temperature ?? 0.6,
            max_tokens: opts.max_tokens ?? 512,
            stream: false,
        };
        return await fetchJson(`${LM_STUDIO_URL}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }, 60000);
    };
    try {
        const r = await attemptChat(model);
        return {
            ok: true,
            model,
            agent,
            content: r.choices[0]?.message?.content || '',
            usage: r.usage || null,
            latencyMs: Date.now() - started,
        };
    }
    catch (e) {
        // If the model failed to load (common when a 26B is requested under memory
        // pressure), automatically retry once with Phi-4 which is almost always warm.
        const looksLikeLoadFailure = /Failed to load model|Operation canceled|unload|not yet loaded/i.test(e.message || '');
        if (looksLikeLoadFailure) {
            const fallbackHint = 'phi-4';
            const fallbackModel = await resolveModel(fallbackHint);
            if (fallbackModel && fallbackModel !== model) {
                try {
                    const r = await attemptChat(fallbackModel);
                    logger_1.default.info(`LM Studio fallback: ${model} failed, served via ${fallbackModel}`);
                    return {
                        ok: true,
                        model: fallbackModel,
                        agent,
                        content: r.choices[0]?.message?.content || '',
                        usage: r.usage || null,
                        latencyMs: Date.now() - started,
                    };
                }
                catch (e2) {
                    return { ok: false, reason: `Both ${model} and fallback ${fallbackModel} failed. Last: ${e2.message}`, hint: 'Try `lms load microsoft/phi-4` then retry' };
                }
            }
        }
        return { ok: false, reason: e.message, hint: 'Check `lms server status` and `lms ps`' };
    }
}
/** Build a system prompt that grounds the agent in their VirtualPC role. */
function systemPromptForAgent(agent, role, context) {
    return [
        `You are ${agent}, ${role}, an agent inside the VirtualPC multi-agent system.`,
        `Respond in character. Keep answers grounded in VirtualPC context. Be concise unless asked to expand.`,
        context ? `\nCurrent context:\n${context}` : '',
    ].filter(Boolean).join('\n');
}
//# sourceMappingURL=lmstudio.js.map