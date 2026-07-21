import {
  isCloudModel,
  isGpuDependent,
  resolveModel,
  evaluateProbe,
  DEFAULT_FALLBACK,
} from '../../src/gpu/availability';

/**
 * Unit tests for GPU availability + dynamic model fallback — agents on
 * GPU-dependent local models switch to a no-GPU "flux" model when the GPU is
 * unavailable, and switch back when it returns.
 */

describe('model classification', () => {
  it('recognises cloud models', () => {
    expect(isCloudModel('claude-sonnet')).toBe(true);
    expect(isCloudModel('claude-opus')).toBe(true);
    expect(isCloudModel('qwen-coder-32b')).toBe(false);
  });
  it('recognises GPU-dependent local models', () => {
    expect(isGpuDependent('qwen-coder-32b')).toBe(true);
    expect(isGpuDependent('devstral')).toBe(true);
    expect(isGpuDependent('deepseek-r1')).toBe(true);
    expect(isGpuDependent('claude-sonnet')).toBe(false);
  });
});

describe('resolveModel', () => {
  it('keeps the lead model when the GPU is available', () => {
    const r = resolveModel(['qwen-coder-32b', 'claude-sonnet'], true);
    expect(r.model).toBe('qwen-coder-32b');
    expect(r.switched).toBe(false);
  });
  it('switches a GPU-dependent lead to the cloud fallback in the list when GPU is down', () => {
    const r = resolveModel(['qwen-coder-32b', 'claude-sonnet', 'devstral'], false);
    expect(r.model).toBe('claude-sonnet');
    expect(r.switched).toBe(true);
  });
  it('uses the default flux fallback when no cloud model is listed', () => {
    const r = resolveModel(['devstral', 'deepseek-r1'], false);
    expect(r.model).toBe(DEFAULT_FALLBACK);
    expect(r.switched).toBe(true);
  });
  it('does not switch when the lead already needs no GPU', () => {
    const r = resolveModel(['claude-sonnet', 'devstral'], false);
    expect(r.model).toBe('claude-sonnet');
    expect(r.switched).toBe(false);
  });
  it('Athena (claude-opus) is unaffected by GPU state', () => {
    expect(resolveModel(['claude-opus'], false).model).toBe('claude-opus');
  });
});

describe('evaluateProbe', () => {
  it('available when nvidia-smi reports GPUs', () => {
    expect(evaluateProbe({ smiOk: true, procPresent: true, gpuCount: 2 }).available).toBe(true);
  });
  it('unavailable + driver-not-loaded reason when /proc absent', () => {
    const s = evaluateProbe({ smiOk: false, procPresent: false, gpuCount: 0 });
    expect(s.available).toBe(false);
    expect(s.reason).toMatch(/driver not loaded/i);
  });
});
