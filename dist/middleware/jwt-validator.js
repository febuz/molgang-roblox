"use strict";
/**
 * JWT Token Validator - Authentication & Authorization Middleware
 *
 * Validates JWT tokens and API keys for incoming requests
 * - Token validation with expiration checks
 * - Role-based access control (RBAC)
 * - Token refresh logic
 * - Token revocation support
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.refreshToken = refreshToken;
exports.revokeToken = revokeToken;
exports.validateToken = validateToken;
exports.requirePermission = requirePermission;
exports.requireRole = requireRole;
exports.validateApiKey = validateApiKey;
exports.optionalAuth = optionalAuth;
const jwt = __importStar(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
// Revoked tokens (in production, use Redis)
const revokedTokens = new Set();
/**
 * Generate JWT token
 */
function generateToken(agentId, agentName, role = 'user') {
    const token = jwt.sign({
        sub: agentId,
        agent_name: agentName,
        role,
        permissions: getPermissionsByRole(role),
    }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    const refreshToken = jwt.sign({
        sub: agentId,
        type: 'refresh',
    }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    return {
        token,
        refreshToken,
        expiresIn: TOKEN_EXPIRY,
    };
}
/**
 * Verify and decode JWT token
 */
function verifyToken(token) {
    try {
        // Check if token is revoked
        if (revokedTokens.has(token)) {
            logger_1.default.warn('Attempt to use revoked token');
            return null;
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            logger_1.default.debug('Token expired');
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            logger_1.default.debug('Invalid token');
        }
        return null;
    }
}
/**
 * Refresh token
 */
function refreshToken(refreshToken) {
    try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        if (decoded.type !== 'refresh') {
            return null;
        }
        const newToken = jwt.sign({
            sub: decoded.sub,
            role: decoded.role || 'user',
            permissions: decoded.permissions || [],
        }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
        return {
            token: newToken,
            expiresIn: TOKEN_EXPIRY,
        };
    }
    catch (error) {
        logger_1.default.debug('Refresh token validation failed');
        return null;
    }
}
/**
 * Revoke token
 */
function revokeToken(token) {
    revokedTokens.add(token);
    logger_1.default.info(`Token revoked for agent`);
}
/**
 * Middleware: Validate JWT token
 */
function validateToken(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        res.status(401).json({ error: 'Missing authentication token' });
        return;
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    req.agent = {
        id: decoded.sub,
        name: decoded.agent_name || decoded.sub,
        role: decoded.role,
        permissions: decoded.permissions || [],
    };
    req.token = token;
    next();
}
/**
 * Middleware: Check required permissions
 */
function requirePermission(...permissions) {
    return (req, res, next) => {
        if (!req.agent) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const hasPermission = permissions.some((perm) => req.agent.permissions.includes(perm));
        if (!hasPermission) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
}
/**
 * Middleware: Check required role
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.agent) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (!roles.includes(req.agent.role)) {
            res.status(403).json({ error: 'Insufficient role' });
            return;
        }
        next();
    };
}
/**
 * Middleware: API Key authentication (alternative to JWT)
 */
function validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || !isValidApiKey(apiKey)) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
    }
    const agentInfo = getAgentByApiKey(apiKey);
    if (!agentInfo) {
        res.status(401).json({ error: 'Unknown API key' });
        return;
    }
    req.agent = agentInfo;
    next();
}
/**
 * Middleware: Optional authentication (uses token if present)
 */
function optionalAuth(req, res, next) {
    const token = extractToken(req);
    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.agent = {
                id: decoded.sub,
                name: decoded.agent_name || decoded.sub,
                role: decoded.role,
                permissions: decoded.permissions || [],
            };
        }
    }
    next();
}
// ============================================================
// Helper Functions
// ============================================================
function extractToken(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    // Check x-access-token header
    const xToken = req.headers['x-access-token'];
    if (xToken && typeof xToken === 'string') {
        return xToken;
    }
    // Check cookie
    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenMatch = cookies.match(/token=([^;]+)/);
        if (tokenMatch) {
            return tokenMatch[1];
        }
    }
    return null;
}
function getPermissionsByRole(role) {
    switch (role) {
        case 'admin':
            return [
                'read:all',
                'write:all',
                'delete:all',
                'manage:agents',
                'manage:tokens',
                'view:analytics',
            ];
        case 'agent':
            return ['read:own', 'write:own', 'read:shared', 'execute:tasks'];
        case 'user':
        default:
            return ['read:own', 'write:own'];
    }
}
function isValidApiKey(apiKey) {
    // In production, validate against database
    // For now, check format
    return apiKey.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(apiKey);
}
function getAgentByApiKey(apiKey) {
    // In production, query database
    // For testing, generate from hash
    if (!isValidApiKey(apiKey)) {
        return null;
    }
    const hash = require('crypto').createHash('sha256').update(apiKey).digest('hex');
    return {
        id: hash.slice(0, 16),
        name: `agent-${hash.slice(0, 8)}`,
        role: 'agent',
        permissions: getPermissionsByRole('agent'),
    };
}
exports.default = {
    generateToken,
    verifyToken,
    refreshToken,
    revokeToken,
    validateToken,
    requirePermission,
    requireRole,
    validateApiKey,
    optionalAuth,
};
//# sourceMappingURL=jwt-validator.js.map