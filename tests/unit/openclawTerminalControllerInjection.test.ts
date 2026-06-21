/**
 * Security regression: executeInTerminal used to interpolate the agent-supplied
 * `command` into a shell string (`tmux send-keys ... "${command}" Enter`,
 * `powershell -Command "${command}"`) and run it via execSync — a command
 * injection vector. It must now pass the command as a single argv element via
 * execFile, so shell metacharacters are never parsed by a shell.
 */

const mockExecFileSync = jest.fn((..._args: any[]): string => 'ok');
const mockExecSync = jest.fn((..._args: any[]): string => 'should-not-be-used');

jest.mock('child_process', () => ({
  exec: jest.fn(),
  execSync: mockExecSync,
  execFileSync: mockExecFileSync,
}));

// Allow every command through the containment chokepoint so we exercise the
// exec path itself.
jest.mock('../../src/containment', () => ({
  containmentGuard: { assertAllowed: jest.fn() },
  ContainmentError: class ContainmentError extends Error {},
}));

// os.platform is a read-only namespace member (can't spyOn), so mock the module.
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  platform: jest.fn(() => 'linux'),
}));

import * as os from 'os';
import { terminalController } from '../../src/openclaw-terminal-controller';

const mockPlatform = os.platform as unknown as jest.Mock;

describe('executeInTerminal command-injection hardening', () => {
  beforeEach(() => {
    mockExecFileSync.mockClear();
    mockExecSync.mockClear();
  });

  it('on linux, passes the command as one literal argv element to tmux (no shell)', async () => {
    mockPlatform.mockReturnValue('linux');
    const malicious = '"; rm -rf ~ #';

    await terminalController.executeInTerminal('primary', malicious);

    expect(mockExecSync).not.toHaveBeenCalled();
    expect(mockExecFileSync).toHaveBeenCalledTimes(1);
    const [file, args] = mockExecFileSync.mock.calls[0]!;
    expect(file).toBe('tmux');
    expect(args).toEqual(['send-keys', '-t', 'claude-code-a', malicious, 'Enter']);
    // The dangerous payload is an isolated argv element, not concatenated into
    // a command string anywhere.
    expect(args).toContain(malicious);
  });

  it('maps the secondary terminal to the claude-code-b tmux target', async () => {
    mockPlatform.mockReturnValue('linux');
    await terminalController.executeInTerminal('secondary', 'echo hi');
    const [, args] = mockExecFileSync.mock.calls[0]!;
    expect(args[2]).toBe('claude-code-b');
  });

  it('on windows, hands the command to powershell as a single argument', async () => {
    mockPlatform.mockReturnValue('win32');
    const malicious = '$(calc.exe)';

    await terminalController.executeInTerminal('primary', malicious);

    expect(mockExecSync).not.toHaveBeenCalled();
    expect(mockExecFileSync).toHaveBeenCalledTimes(1);
    const [file, args] = mockExecFileSync.mock.calls[0]!;
    expect(file).toBe('powershell');
    expect(args).toEqual(['-Command', malicious]);
  });
});
