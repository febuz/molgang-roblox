/**
 * OpenClaw Emergency Kill Switch (Ctrl-Q-Q)
 *
 * Global keyboard listener that terminates all automation processes
 * when user presses Ctrl+Q twice rapidly within 1 second.
 *
 * This is a critical safety mechanism to return control to user
 * when autonomous automation becomes unresponsive or problematic.
 */
interface KillSwitchConfig {
    keyCombo: string;
    timeWindow: number;
    debug: boolean;
}
export declare class OpenClawKillSwitch {
    private config;
    private lastQPress;
    private qPressCount;
    private isKillSwitchActive;
    constructor(config?: Partial<KillSwitchConfig>);
    /**
     * Initialize kill switch listener
     * Must be called at application startup
     */
    initialize(): void;
    /**
     * Setup keyboard listener for Ctrl+Q+Q detection
     */
    private setupKeyboardListener;
    /**
     * Handle individual keypress events
     */
    private handleKeypress;
    /**
     * Setup monitoring for Selenium processes
     * When running demos, watch for Ctrl+Q signals
     */
    private setupSeleniumMonitoring;
    /**
     * ACTIVATE KILL SWITCH - Terminate all automation
     */
    activateKillSwitch(): void;
    /**
     * Kill all automation-related processes
     */
    private killAllAutomation;
    /**
     * Kill a specific process by name pattern
     */
    private killProcess;
    /**
     * Get OS-specific kill command
     */
    private getOSKillCommand;
    /**
     * Disable mouse control
     */
    private disableMouseControl;
    /**
     * Reset automation (for recovery after kill switch)
     */
    reset(): void;
    /**
     * Get current status
     */
    getStatus(): {
        isActive: boolean;
        timeWindow: number;
        qPressCount: number;
    };
}
export declare const killSwitch: OpenClawKillSwitch;
export {};
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
//# sourceMappingURL=openclaw-kill-switch.d.ts.map