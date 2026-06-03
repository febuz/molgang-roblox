/**
 * Employee Authentication System
 *
 * 5-role based access control:
 * - CEO (Full access, audit logging)
 * - CTO (Infrastructure, system config)
 * - Developer (Feature development, code)
 * - Artist (Visual design, assets)
 * - Tech Artist (Performance, shaders, optimization)
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { generateSecret, verifyTotp, otpauthUri } from './totp';
import FieldCrypto from '../security/fieldCrypto';
import logger from '../utils/logger';

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;
const PASSWORD_HASH_PREFIX = 'scrypt$';
const TWO_FA_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TWO_FA_ISSUER = 'VirtualPC';

export type UserRole = 'ceo' | 'cto' | 'developer' | 'artist' | 'tech_artist';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: Date;
  lastLogin?: Date;
  status: 'active' | 'inactive' | 'suspended';
  metadata?: Record<string, any>;
  /** TOTP secret in base32. Present even when 2FA is mid-setup. */
  totpSecret?: string;
  /** Once true, login requires a valid TOTP code in addition to password. */
  totpEnabled?: boolean;
}

interface TwoFactorChallenge {
  userId: string;
  expiresAt: Date;
  ipAddress?: string;
  deviceId?: string;
  location?: string;
}

export interface AuthToken {
  userId: string;
  username: string;
  role: UserRole;
  issuedAt: Date;
  expiresAt: Date;
  sessionId: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  ipAddress?: string;
  deviceId?: string;
  location?: string;
}

export interface RolePermissions {
  canAccessDashboard: boolean;
  canManageUsers: boolean;
  canViewAuditLog: boolean;
  canModifyConfig: boolean;
  canExecuteCommands: boolean;
  canViewSensitiveData: boolean;
  canAssignTasks: boolean;
  canApproveDeployments: boolean;
  canAccessFinancials: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ceo: {
    canAccessDashboard: true,
    canManageUsers: true,
    canViewAuditLog: true,
    canModifyConfig: true,
    canExecuteCommands: true,
    canViewSensitiveData: true,
    canAssignTasks: true,
    canApproveDeployments: true,
    canAccessFinancials: true
  },
  cto: {
    canAccessDashboard: true,
    canManageUsers: false,
    canViewAuditLog: true,
    canModifyConfig: true,
    canExecuteCommands: true,
    canViewSensitiveData: false,
    canAssignTasks: true,
    canApproveDeployments: true,
    canAccessFinancials: false
  },
  developer: {
    canAccessDashboard: true,
    canManageUsers: false,
    canViewAuditLog: false,
    canModifyConfig: false,
    canExecuteCommands: false,
    canViewSensitiveData: false,
    canAssignTasks: false,
    canApproveDeployments: false,
    canAccessFinancials: false
  },
  artist: {
    canAccessDashboard: true,
    canManageUsers: false,
    canViewAuditLog: false,
    canModifyConfig: false,
    canExecuteCommands: false,
    canViewSensitiveData: false,
    canAssignTasks: false,
    canApproveDeployments: false,
    canAccessFinancials: false
  },
  tech_artist: {
    canAccessDashboard: true,
    canManageUsers: false,
    canViewAuditLog: false,
    canModifyConfig: false,
    canExecuteCommands: false,
    canViewSensitiveData: false,
    canAssignTasks: false,
    canApproveDeployments: false,
    canAccessFinancials: false
  }
};

export class AuthSystem {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, AuthToken> = new Map();
  private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private twoFactorChallenges: Map<string, TwoFactorChallenge> = new Map();
  /** When set, TOTP secrets are encrypted at rest (backlog 6.5.20). */
  private fieldCrypto?: FieldCrypto;

  constructor(opts?: { fieldCrypto?: FieldCrypto }) {
    // Explicit injection wins; otherwise auto-enable if FIELD_ENCRYPTION_KEY is set.
    this.fieldCrypto = opts?.fieldCrypto ?? (process.env.FIELD_ENCRYPTION_KEY ? FieldCrypto.fromEnv() : undefined);
    this.initializeDefaultUsers();
  }

  /** Store form of a TOTP secret: encrypted when field encryption is enabled. */
  private storeTotpSecret(secret: string): string {
    return this.fieldCrypto ? this.fieldCrypto.encrypt(secret) : secret;
  }

  /** Usable plaintext TOTP secret for a user (decrypts at-rest ciphertext). */
  private readTotpSecret(user: User): string | undefined {
    if (!user.totpSecret) return undefined;
    return this.fieldCrypto ? this.fieldCrypto.decryptField(user.totpSecret) as string : user.totpSecret;
  }

  /**
   * Initialize default users (demo)
   */
  private initializeDefaultUsers(): void {
    const defaults: User[] = [
      {
        id: 'user_ceo_001',
        username: 'ceo',
        email: 'ceo@virtualpc.local',
        role: 'ceo',
        passwordHash: this.hashPassword('ceo123'), // Demo password
        createdAt: new Date(),
        status: 'active'
      },
      {
        id: 'user_cto_001',
        username: 'kai',
        email: 'kai@virtualpc.local',
        role: 'cto',
        passwordHash: this.hashPassword('kai123'),
        createdAt: new Date(),
        status: 'active'
      },
      {
        id: 'user_dev_001',
        username: 'zip',
        email: 'zip@virtualpc.local',
        role: 'developer',
        passwordHash: this.hashPassword('zip123'),
        createdAt: new Date(),
        status: 'active'
      },
      {
        id: 'user_artist_001',
        username: 'mira',
        email: 'mira@virtualpc.local',
        role: 'artist',
        passwordHash: this.hashPassword('mira123'),
        createdAt: new Date(),
        status: 'active'
      },
      {
        id: 'user_tech_artist_001',
        username: 'luna',
        email: 'luna@virtualpc.local',
        role: 'tech_artist',
        passwordHash: this.hashPassword('luna123'),
        createdAt: new Date(),
        status: 'active'
      }
    ];

    defaults.forEach(user => {
      this.users.set(user.id, user);
    });

    logger.info(`✓ Auth system initialized with ${defaults.length} default users`);
  }

  /**
   * Hash a password with scrypt and a fresh random salt.
   * Format: "scrypt$<salt-b64>$<hash-b64>" — self-contained, no external store.
   */
  private hashPassword(password: string): string {
    const salt = randomBytes(SCRYPT_SALT_BYTES);
    const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
    return `${PASSWORD_HASH_PREFIX}${salt.toString('base64')}$${derived.toString('base64')}`;
  }

  /**
   * Constant-time verify against a stored scrypt hash. Refuses any other format
   * so legacy base64 hashes from the previous demo implementation can't pass.
   */
  private verifyPassword(password: string, stored: string): boolean {
    if (!stored.startsWith(PASSWORD_HASH_PREFIX)) return false;
    const [, saltB64, hashB64] = stored.split('$');
    if (!saltB64 || !hashB64) return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    if (expected.length !== SCRYPT_KEYLEN) return false;
    const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
    return timingSafeEqual(derived, expected);
  }

  /**
   * Login user. If the account has 2FA enabled, the password check passes but
   * the response carries `requires2fa: true` plus a short-lived `challengeId`
   * that must be exchanged via verifyTwoFactor() before a session is issued.
   */
  login(request: LoginRequest): {
    success: boolean;
    token?: AuthToken;
    requires2fa?: boolean;
    challengeId?: string;
    error?: string;
  } {
    const { username, password, ipAddress, deviceId, location } = request;

    // Check brute force
    const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: new Date(0) };
    if (attempts.count >= 5 && Date.now() - attempts.lastAttempt.getTime() < 900000) {
      logger.warn(`🚫 Brute force attempt for user: ${username} from ${ipAddress}`);
      return { success: false, error: 'Too many login attempts. Try again in 15 minutes.' };
    }

    // Find user
    const user = Array.from(this.users.values()).find(u => u.username === username);
    if (!user) {
      this.recordFailedAttempt(username);
      logger.warn(`❌ Login failed: user not found (${username})`);
      return { success: false, error: 'Invalid username or password' };
    }

    // Check password
    if (!this.verifyPassword(password, user.passwordHash)) {
      this.recordFailedAttempt(username);
      logger.warn(`❌ Login failed: invalid password (${username}) from ${ipAddress}`);
      return { success: false, error: 'Invalid username or password' };
    }

    // Check status
    if (user.status !== 'active') {
      logger.warn(`❌ Login failed: user inactive (${username})`);
      return { success: false, error: 'Account is not active' };
    }

    // Clear failed-attempt counter — password was correct.
    this.loginAttempts.delete(username);

    // If 2FA is enabled, do not issue a session yet — return a challenge.
    if (user.totpEnabled && user.totpSecret) {
      const challengeId = `2fa_${Date.now()}_${randomBytes(12).toString('hex')}`;
      this.twoFactorChallenges.set(challengeId, {
        userId: user.id,
        expiresAt: new Date(Date.now() + TWO_FA_CHALLENGE_TTL_MS),
        ipAddress,
        deviceId,
        location,
      });
      logger.info(`🔐 2FA required: ${username} from ${ipAddress}`);
      return { success: false, requires2fa: true, challengeId };
    }

    return { success: true, token: this.issueSession(user) };
  }

  /**
   * Exchange a 2FA challenge + TOTP code for a real session token.
   * Single-use: the challenge is consumed whether or not the code matches.
   */
  verifyTwoFactor(challengeId: string, code: string): { success: boolean; token?: AuthToken; error?: string } {
    const challenge = this.twoFactorChallenges.get(challengeId);
    if (!challenge) {
      return { success: false, error: 'Invalid or expired 2FA challenge' };
    }
    // Always consume — prevents replay/brute-force on the challenge.
    this.twoFactorChallenges.delete(challengeId);

    if (new Date() > challenge.expiresAt) {
      return { success: false, error: 'Invalid or expired 2FA challenge' };
    }

    const user = this.users.get(challenge.userId);
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return { success: false, error: 'Invalid 2FA state' };
    }

    if (!verifyTotp(this.readTotpSecret(user)!, code)) {
      logger.warn(`❌ 2FA failed for ${user.username} from ${challenge.ipAddress}`);
      return { success: false, error: 'Invalid 2FA code' };
    }

    logger.info(`✅ 2FA passed: ${user.username} from ${challenge.ipAddress} [${challenge.deviceId}]`);
    return { success: true, token: this.issueSession(user) };
  }

  /**
   * Begin TOTP setup for a user: generate a secret and otpauth URI. The user
   * must call enableTotp() with a valid code generated from this secret to
   * actually arm 2FA. Calling setup again before enable rotates the secret.
   */
  setupTotp(userId: string): { success: boolean; secret?: string; uri?: string; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    const secret = generateSecret();
    user.totpSecret = this.storeTotpSecret(secret);
    user.totpEnabled = false;
    return {
      success: true,
      secret,
      uri: otpauthUri({ secretBase32: secret, issuer: TWO_FA_ISSUER, accountName: user.email }),
    };
  }

  /**
   * Confirm the authenticator app is wired up by verifying a code, then arm
   * 2FA on the account. Refuses if setupTotp() has not been called.
   */
  enableTotp(userId: string, code: string): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };
    if (!user.totpSecret) return { success: false, error: 'Run setupTotp first' };
    if (!verifyTotp(this.readTotpSecret(user)!, code)) {
      return { success: false, error: 'Invalid 2FA code' };
    }
    user.totpEnabled = true;
    logger.info(`🔐 2FA enabled for ${user.username}`);
    return { success: true };
  }

  /**
   * Disarm 2FA. Requires both the current password (proves session ownership
   * isn't enough) and a valid TOTP code (proves the authenticator is still
   * present, defending against a stolen session that was kept open).
   */
  disableTotp(userId: string, password: string, code: string): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };
    if (!this.verifyPassword(password, user.passwordHash)) {
      return { success: false, error: 'Password incorrect' };
    }
    if (!user.totpSecret || !verifyTotp(this.readTotpSecret(user)!, code)) {
      return { success: false, error: 'Invalid 2FA code' };
    }
    user.totpSecret = undefined;
    user.totpEnabled = false;
    logger.info(`🔓 2FA disabled for ${user.username}`);
    return { success: true };
  }

  /**
   * Issue a fresh session token for a user. Internal helper shared by the
   * password-only and 2FA login paths.
   */
  private issueSession(user: User): AuthToken {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const token: AuthToken = {
      userId: user.id,
      username: user.username,
      role: user.role,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      sessionId,
    };
    this.sessions.set(sessionId, token);
    user.lastLogin = new Date();
    logger.info(`✅ Session issued: ${user.username} (${user.role})`);
    return token;
  }

  /**
   * Record failed login attempt
   */
  private recordFailedAttempt(username: string): void {
    const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: new Date() };
    attempts.count++;
    attempts.lastAttempt = new Date();
    this.loginAttempts.set(username, attempts);
  }

  /**
   * Verify token
   */
  verifyToken(sessionId: string): AuthToken | null {
    const token = this.sessions.get(sessionId);
    if (!token) return null;

    if (new Date() > token.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return token;
  }

  /**
   * Logout user
   */
  logout(sessionId: string): void {
    this.sessions.delete(sessionId);
    logger.info(`✓ Logout: ${sessionId}`);
  }

  /**
   * Get user by ID
   */
  getUser(userId: string): User | null {
    return this.users.get(userId) || null;
  }

  /**
   * Get user role permissions
   */
  getPermissions(role: UserRole): RolePermissions {
    return ROLE_PERMISSIONS[role];
  }

  /**
   * Check permission
   */
  hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
    return ROLE_PERMISSIONS[role][permission];
  }

  /**
   * Get all users
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Create user (admin only)
   */
  createUser(
    username: string,
    email: string,
    role: UserRole,
    password: string
  ): { success: boolean; user?: User; error?: string } {
    // Check username unique
    if (Array.from(this.users.values()).some(u => u.username === username)) {
      return { success: false, error: 'Username already exists' };
    }

    const user: User = {
      id: `user_${role}_${Date.now()}`,
      username,
      email,
      role,
      passwordHash: this.hashPassword(password),
      createdAt: new Date(),
      status: 'active'
    };

    this.users.set(user.id, user);
    logger.info(`✓ User created: ${username} (${role})`);

    return { success: true, user };
  }

  /**
   * Change password
   */
  changePassword(userId: string, oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    if (!this.verifyPassword(oldPassword, user.passwordHash)) {
      return { success: false, error: 'Current password is incorrect' };
    }

    user.passwordHash = this.hashPassword(newPassword);
    logger.info(`✓ Password changed for user: ${user.username}`);

    return { success: true };
  }

  /**
   * Get session statistics
   */
  getSessionStats(): Record<string, any> {
    const activeSessions = Array.from(this.sessions.values());
    const roleBreakdown: Record<UserRole, number> = {
      ceo: 0,
      cto: 0,
      developer: 0,
      artist: 0,
      tech_artist: 0
    };

    activeSessions.forEach(token => {
      roleBreakdown[token.role]++;
    });

    return {
      totalActiveSessions: activeSessions.length,
      totalUsers: this.users.size,
      roleBreakdown,
      usersByRole: {
        ceo: Array.from(this.users.values()).filter(u => u.role === 'ceo').length,
        cto: Array.from(this.users.values()).filter(u => u.role === 'cto').length,
        developer: Array.from(this.users.values()).filter(u => u.role === 'developer').length,
        artist: Array.from(this.users.values()).filter(u => u.role === 'artist').length,
        tech_artist: Array.from(this.users.values()).filter(u => u.role === 'tech_artist').length
      }
    };
  }
}

export default AuthSystem;
