/**
 * Regression: hardware probes (nvidia-smi/df/system_profiler/...) must run with
 * an execSync timeout, or a hung probe (a wedged nvidia driver is the classic
 * case) blocks the calling thread indefinitely. Guard that every execSync call
 * in detectHostResources/detectVRAM passes a numeric timeout.
 */

const mockExecSync = jest.fn((_cmd: string, _opts?: any): string => '8');

jest.mock('child_process', () => ({
  execSync: mockExecSync,
}));

import { detectHostResources } from '../../src/model-router';

describe('model-router probe timeouts', () => {
  beforeEach(() => mockExecSync.mockClear());

  it('passes a numeric timeout to every hardware probe', () => {
    detectHostResources();

    expect(mockExecSync.mock.calls.length).toBeGreaterThan(0);
    for (const [cmd, opts] of mockExecSync.mock.calls) {
      expect(opts).toBeDefined();
      expect(typeof opts.timeout).toBe('number');
      expect(opts.timeout).toBeGreaterThan(0);
    }
  });
});
