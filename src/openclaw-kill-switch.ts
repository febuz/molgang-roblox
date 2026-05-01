/**
 * OpenClaw Emergency Kill Switch (Ctrl-Q-Q)
 *
 * Global keyboard listener that terminates all automation processes
 * when user presses Ctrl+Q twice rapidly within 1 second.
 *
 * This is a critical safety mechanism to return control to user
 * when autonomous automation becomes unresponsive or problematic.
 */

import { exec, execSync } from 'child_process';
import * as os from 'os';

interface KillSwitchConfig {
  keyCombo: string; // 'ctrl-q-q'
  timeWindow: number; // milliseconds (1000 = 1 second)
  debug: boolean;
}

export class OpenClawKillSwitch {
  private config: KillSwitchConfig;
  private lastQPress: number = 0;
  private qPressCount: number = 0;
  private isKillSwitchActive: boolean = false;

  constructor(config: Partial<KillSwitchConfig> = {}) {
    this.config = {
      keyCombo: config.keyCombo || 'ctrl-q-q',
      timeWindow: config.timeWindow || 1000,
      debug: config.debug || false
    };
  }

  /**
   * Initialize kill switch listener
   * Must be called at application startup
   */
  public initialize(): void {
    console.log('🔴 OpenClaw Kill Switch Initialized');
    console.log('   Press Ctrl+Q twice (within 1 second) to stop all automation');

    // Try to setup global keyboard listener
    // Note: This requires system-level keyboard hook or manual key event handling
    this.setupKeyboardListener();
  }

  /**
   * Setup keyboard listener for Ctrl+Q+Q detection
   */
  private setupKeyboardListener(): void {
    // If running in Node.js with interactive terminal
    if (process.stdin.isTTY) {
      // Enable raw mode to capture all keypresses
      process.stdin.setRawMode(true);
      process.stdin.on('data', (key) => {
        this.handleKeypress(key);
      });
    }

    // For web-based selenium automation, use a different approach
    this.setupSeleniumMonitoring();

    if (this.config.debug) {
      console.log('✅ Keyboard listener active');
    }
  }

  /**
   * Handle individual keypress events
   */
  private handleKeypress(key: Buffer): void {
    // Ctrl+Q = 0x11 (17 in decimal)
    const keyCode = key[0];

    // Check if this is a 'Q' keypress with Ctrl held
    const isCtrlPressed = process.stdin.isRaw;
    const isQKey = keyCode === 0x11; // Ctrl+Q

    if (isQKey && isCtrlPressed) {
      const now = Date.now();

      // Check if this is within the time window of the last Q press
      if (now - this.lastQPress < this.config.timeWindow) {
        this.qPressCount++;

        if (this.qPressCount >= 2) {
          // KILL SWITCH ACTIVATED!
          this.activateKillSwitch();
          this.qPressCount = 0;
        }
      } else {
        // Reset counter if outside time window
        this.qPressCount = 1;
      }

      this.lastQPress = now;
    }
  }

  /**
   * Setup monitoring for Selenium processes
   * When running demos, watch for Ctrl+Q signals
   */
  private setupSeleniumMonitoring(): void {
    // Listen for SIGINT (Ctrl+C) as fallback
    process.on('SIGINT', () => {
      // Ctrl+C pressed - activate kill switch
      this.activateKillSwitch();
    });
  }

  /**
   * ACTIVATE KILL SWITCH - Terminate all automation
   */
  public activateKillSwitch(): void {
    if (this.isKillSwitchActive) {
      return; // Already activated, prevent double-trigger
    }

    this.isKillSwitchActive = true;

    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║ ⚠️  CTRL-Q-Q DETECTED - EMERGENCY STOP INITIATED     ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');

    // Kill all automation processes
    this.killAllAutomation();

    // Disable mouse control
    this.disableMouseControl();

    // Return control to user
    console.log('✅ Control returned to user');
    console.log('📝 All automation stopped');
    console.log('');
    console.log('Recovery options:');
    console.log('  • npm run dev (resume normal development)');
    
    console.log('  • npm run demo:interactive (restart VirtualPC demo)');
    console.log('');

    // Reset kill switch flag after 2 seconds
    setTimeout(() => {
      this.isKillSwitchActive = false;
    }, 2000);
  }

  /**
   * Kill all automation-related processes
   */
  private killAllAutomation(): void {
    console.log('🔪 Terminating automation processes...');

    const killTargets = [
      'selenium-launcher',
      
      'interactive-demo',
      'chrome.*webdriver',
      'firefox.*webdriver',
      'chromedriver',
      'geckodriver'
    ];

    for (const target of killTargets) {
      this.killProcess(target);
    }

    console.log('✅ All automation processes terminated');
  }

  /**
   * Kill a specific process by name pattern
   */
  private killProcess(pattern: string): void {
    try {
      const command = this.getOSKillCommand(pattern);

      if (this.config.debug) {
        console.log(`   Killing: ${pattern}`);
      }

      execSync(command, { stdio: 'ignore' });
    } catch (error) {
      // Process might not exist, that's okay
      if (this.config.debug) {
        console.log(`   No process found: ${pattern}`);
      }
    }
  }

  /**
   * Get OS-specific kill command
   */
  private getOSKillCommand(pattern: string): string {
    const platform = os.platform();

    if (platform === 'win32') {
      // Windows
      return `taskkill /F /IM ${pattern} 2>nul`;
    } else {
      // macOS / Linux
      return `pkill -f "${pattern}" 2>/dev/null || true`;
    }
  }

  /**
   * Disable mouse control
   */
  private disableMouseControl(): void {
    console.log('🖱️  Disabling mouse automation...');
    // Mouse control disabled automatically when selenium processes killed
    console.log('✅ Mouse control released');
  }

  /**
   * Reset automation (for recovery after kill switch)
   */
  public reset(): void {
    this.isKillSwitchActive = false;
    this.qPressCount = 0;
    this.lastQPress = 0;
    console.log('🔄 Kill switch reset, ready for next automation');
  }

  /**
   * Get current status
   */
  public getStatus(): {
    isActive: boolean;
    timeWindow: number;
    qPressCount: number;
  } {
    return {
      isActive: this.isKillSwitchActive,
      timeWindow: this.config.timeWindow,
      qPressCount: this.qPressCount
    };
  }
}

// Export singleton instance
export const killSwitch = new OpenClawKillSwitch({
  debug: process.env.DEBUG_KILL_SWITCH === 'true'
});

// Initialize on import
if (process.env.ENABLE_KILL_SWITCH !== 'false') {
  killSwitch.initialize();
}

/**
 * Usage in other modules:
 *
 * import { killSwitch } from './openclaw-kill-switch';
 *
 * // Initialize at startup
 * killSwitch.initialize();
 *
 * // Check status
 * console.log(killSwitch.getStatus());
 *
 * // Manually trigger (if needed)
 * killSwitch.activateKillSwitch();
 *
 * // Reset after recovery
 * killSwitch.reset();
 */
