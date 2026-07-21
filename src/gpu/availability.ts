/**
 * GPU availability + dynamic model fallback.
 *
 * The box's GPUs can be temporarily unavailable (driver unloaded, maintenance).
 * Agents whose lead model is a *local, GPU-dependent* model (Ollama/LM Studio:
 * qwen-coder, devstral, deepseek-r1, hermes, phi, gemma) must not stall — they
 * dynamically switch to a no-GPU "flux" fallback (a cloud model, default
 * claude-sonnet) so progress continues. When a GPU is detected again, the daemon
 * boots LM Studio + reloads local models and agents switch back.
 *
 * This module is the pure decision core (no I/O); the daemon (./index.ts) probes
 * the hardware and drives it.
 */

/** Model-name fragments that run in the cloud and need no local GPU. */
const CLOUD_FRAGMENTS = ['claude', 'gpt', 'gemini', 'grok', 'perplexity', 'mistral-large', 'deepseek-chat', 'sonar'];
/** Local model fragments that require a GPU to run usefully. */
const GPU_LOCAL_FRAGMENTS = ['qwen', 'devstral', 'deepseek-r1', 'hermes', 'phi-4', 'phi4', 'gemma', 'llama', 'kimi', 'moonshot', 'mistral-7b'];

/** Default no-GPU fallback ("flux") model. */
export const DEFAULT_FALLBACK = 'claude-sonnet';

export function isCloudModel(model: string): boolean {
  const m = (model || '').toLowerCase();
  return CLOUD_FRAGMENTS.some(f => m.includes(f));
}

/** True when the model needs a local GPU to run (so it's unavailable GPU-down). */
export function isGpuDependent(model: string): boolean {
  const m = (model || '').toLowerCase();
  if (isCloudModel(m)) return false;
  return GPU_LOCAL_FRAGMENTS.some(f => m.includes(f));
}

export interface ModelResolution {
  model: string;
  /** True when we had to switch off the agent's preferred lead model. */
  switched: boolean;
  reason: string;
}

/**
 * Resolve the model an agent should actually use given GPU availability.
 *  - GPU up  → the agent's lead model (models[0]).
 *  - GPU down + lead is GPU-dependent → first cloud model in the list, else the
 *    fallback "flux" model.
 *  - GPU down + lead already cloud → keep it (no switch needed).
 */
export function resolveModel(models: string[], gpuAvailable: boolean, fallback = DEFAULT_FALLBACK): ModelResolution {
  const lead = (models && models[0]) || fallback;
  if (gpuAvailable) return { model: lead, switched: false, reason: 'gpu available' };
  if (!isGpuDependent(lead)) return { model: lead, switched: false, reason: 'lead model needs no gpu' };
  const cloud = (models || []).find(m => isCloudModel(m));
  if (cloud) return { model: cloud, switched: true, reason: `gpu down — switched to cloud ${cloud}` };
  return { model: fallback, switched: true, reason: `gpu down — switched to fallback ${fallback}` };
}

export interface GpuProbe {
  /** nvidia-smi exited 0 and returned at least one GPU line. */
  smiOk: boolean;
  /** /proc/driver/nvidia/version present. */
  procPresent: boolean;
  /** Parsed GPU count from nvidia-smi (0 if none). */
  gpuCount: number;
}

export interface GpuState {
  available: boolean;
  gpuCount: number;
  reason: string;
}

/** Decide availability from a hardware probe. */
export function evaluateProbe(p: GpuProbe): GpuState {
  if (p.smiOk && p.gpuCount > 0) return { available: true, gpuCount: p.gpuCount, reason: `${p.gpuCount} GPU(s) via nvidia-smi` };
  if (!p.procPresent) return { available: false, gpuCount: 0, reason: 'NVIDIA driver not loaded (/proc/driver/nvidia absent)' };
  return { available: false, gpuCount: 0, reason: 'nvidia-smi did not report a usable GPU' };
}
