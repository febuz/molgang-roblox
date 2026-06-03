/**
 * Login Anomaly Monitor (backlog 6.5.19)
 *
 * Per-attempt anomaly classification, complementing the existing pieces:
 *   - rateLimiter  -> blocks brute force at the edge
 *   - securityDashboard -> aggregate failed-login-by-IP scoring
 *   - this module  -> classifies an *individual* login attempt against the
 *                     user's learned history and recent activity.
 *
 * It learns a user's known devices/IPs from successful logins, then flags
 * future attempts that deviate: a new device, a new IP, a burst of recent
 * failures, or an implausibly high attempt velocity.
 *
 * Geo / "impossible travel" detection is intentionally out of scope here —
 * it needs an IP-geolocation provider this service doesn't have. The IP-based
 * signals below are the provider-free subset.
 */

export type LoginAnomalyFlag = 'new_device' | 'new_ip' | 'failed_burst' | 'high_velocity';

export type LoginRiskLevel = 'low' | 'medium' | 'high';

export interface LoginAttempt {
  username: string;
  ipAddress: string;
  deviceId: string;
  outcome: 'success' | 'failure';
  /** Epoch millis. Defaults to the monitor's clock when omitted. */
  timestamp?: number;
}

export interface LoginRiskAssessment {
  username: string;
  flags: LoginAnomalyFlag[];
  score: number; // 0-100, higher = riskier
  level: LoginRiskLevel;
}

export interface LoginAnomalyConfig {
  /** Recent failures for a user within failureWindowMs that trip `failed_burst`. */
  failedBurstThreshold: number;
  failureWindowMs: number;
  /** Attempts from a user within velocityWindowMs that trip `high_velocity`. */
  velocityThreshold: number;
  velocityWindowMs: number;
  /** Risk score boundaries: >= highAt is high, >= mediumAt is medium. */
  mediumAt: number;
  highAt: number;
}

export const DEFAULT_LOGIN_ANOMALY_CONFIG: LoginAnomalyConfig = {
  failedBurstThreshold: 3,
  failureWindowMs: 15 * 60 * 1000, // 15 min
  velocityThreshold: 5,
  velocityWindowMs: 60 * 1000, // 1 min
  mediumAt: 30,
  highAt: 60,
};

/** Per-flag contribution to the risk score. */
const FLAG_WEIGHTS: Record<LoginAnomalyFlag, number> = {
  new_device: 25,
  new_ip: 20,
  failed_burst: 35,
  high_velocity: 30,
};

interface UserHistory {
  knownDevices: Set<string>;
  knownIps: Set<string>;
  recent: LoginAttempt[]; // chronological, pruned to the longest window we care about
}

export class LoginAnomalyMonitor {
  private readonly config: LoginAnomalyConfig;
  private readonly history = new Map<string, UserHistory>();

  constructor(config: Partial<LoginAnomalyConfig> = {}) {
    this.config = { ...DEFAULT_LOGIN_ANOMALY_CONFIG, ...config };
  }

  /** Override for tests; real callers rely on the timestamp on each attempt. */
  private now(ts?: number): number {
    return ts ?? Date.now();
  }

  private getOrCreate(username: string): UserHistory {
    let h = this.history.get(username);
    if (!h) {
      h = { knownDevices: new Set(), knownIps: new Set(), recent: [] };
      this.history.set(username, h);
    }
    return h;
  }

  /**
   * Classify an attempt WITHOUT mutating history. A brand-new user (no history)
   * is treated as a baseline-establishing login, not an anomaly — first device
   * and first IP are expected, so they are not flagged.
   */
  evaluate(attempt: LoginAttempt): LoginRiskAssessment {
    const ts = this.now(attempt.timestamp);
    const h = this.history.get(attempt.username);
    const flags: LoginAnomalyFlag[] = [];

    const isKnownUser = !!h && (h.knownDevices.size > 0 || h.knownIps.size > 0);

    if (isKnownUser) {
      if (!h!.knownDevices.has(attempt.deviceId)) flags.push('new_device');
      if (!h!.knownIps.has(attempt.ipAddress)) flags.push('new_ip');
    }

    if (h) {
      const recentFailures = h.recent.filter(
        a => a.outcome === 'failure' && ts - this.now(a.timestamp) <= this.config.failureWindowMs
      ).length;
      if (recentFailures >= this.config.failedBurstThreshold) flags.push('failed_burst');

      const recentAttempts = h.recent.filter(
        a => ts - this.now(a.timestamp) <= this.config.velocityWindowMs
      ).length;
      if (recentAttempts >= this.config.velocityThreshold) flags.push('high_velocity');
    }

    const score = Math.min(
      100,
      flags.reduce((sum, f) => sum + FLAG_WEIGHTS[f], 0)
    );
    const level: LoginRiskLevel =
      score >= this.config.highAt ? 'high' : score >= this.config.mediumAt ? 'medium' : 'low';

    return { username: attempt.username, flags, score, level };
  }

  /**
   * Record an attempt into history. On success, the device/IP become "known"
   * for the user. Keeps the per-user recent buffer pruned to the widest window.
   */
  record(attempt: LoginAttempt): void {
    const ts = this.now(attempt.timestamp);
    const h = this.getOrCreate(attempt.username);

    h.recent.push({ ...attempt, timestamp: ts });
    const widest = Math.max(this.config.failureWindowMs, this.config.velocityWindowMs);
    h.recent = h.recent.filter(a => ts - (a.timestamp as number) <= widest);

    if (attempt.outcome === 'success') {
      h.knownDevices.add(attempt.deviceId);
      h.knownIps.add(attempt.ipAddress);
    }
  }

  /** Convenience: evaluate then record, returning the assessment. */
  assess(attempt: LoginAttempt): LoginRiskAssessment {
    const assessment = this.evaluate(attempt);
    this.record(attempt);
    return assessment;
  }

  /** Read-only snapshot of what the monitor has learned for a user. */
  getUserProfile(username: string): { knownDevices: string[]; knownIps: string[]; recentCount: number } | null {
    const h = this.history.get(username);
    if (!h) return null;
    return {
      knownDevices: [...h.knownDevices],
      knownIps: [...h.knownIps],
      recentCount: h.recent.length,
    };
  }
}

export default LoginAnomalyMonitor;
