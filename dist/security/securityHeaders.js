"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsHeaders = exports.securityHeaders = void 0;
const securityHeaders = (_req, res, next) => {
    // Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:");
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // X-Frame-Options (Clickjacking protection)
    res.setHeader('X-Frame-Options', 'DENY');
    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions-Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // Strict-Transport-Security (HSTS)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Cross-Origin policies
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
};
exports.securityHeaders = securityHeaders;
const corsHeaders = (req, res, next) => {
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3100',
        'https://api.virtualpc.com',
    ];
    const origin = req.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '3600');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    return next();
};
exports.corsHeaders = corsHeaders;
exports.default = { securityHeaders: exports.securityHeaders, corsHeaders: exports.corsHeaders };
//# sourceMappingURL=securityHeaders.js.map