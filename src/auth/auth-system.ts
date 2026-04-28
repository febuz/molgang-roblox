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
import logger from '../utils/logger';

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;
const PASSWORD_HASH_PREFIX = 'scrypt$';

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

  constructor() {
    this.initializeDefaultUsers();
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
   * Login user
   */
  login(request: LoginRequest): { success: boolean; token?: AuthToken; error?: string } {
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

    // Create session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const token: AuthToken = {
      userId: user.id,
      username: user.username,
      role: user.role,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      sessionId
    };

    this.sessions.set(sessionId, token);
    user.lastLogin = new Date();

    // Clear login attempts
    this.loginAttempts.delete(username);

    logger.info(`✅ Login successful: ${username} (${user.role}) from ${ipAddress} [${deviceId}]`);

    return { success: true, token };
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
