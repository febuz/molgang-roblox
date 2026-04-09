"use strict";
/**
 * Logger - Structured logging for the system
 */
Object.defineProperty(exports, "__esModule", { value: true });
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};
const currentLevel = (process.env.LOG_LEVEL || 'info');
const logger = {
    debug: (msg, data) => {
        if (LOG_LEVELS.debug >= LOG_LEVELS[currentLevel]) {
            console.debug(`[DEBUG] ${msg}`, data || '');
        }
    },
    info: (msg, data) => {
        if (LOG_LEVELS.info >= LOG_LEVELS[currentLevel]) {
            console.log(`[INFO] ${msg}`, data || '');
        }
    },
    warn: (msg, data) => {
        if (LOG_LEVELS.warn >= LOG_LEVELS[currentLevel]) {
            console.warn(`[WARN] ${msg}`, data || '');
        }
    },
    error: (msg, error) => {
        if (LOG_LEVELS.error >= LOG_LEVELS[currentLevel]) {
            console.error(`[ERROR] ${msg}`, error || '');
        }
    }
};
exports.default = logger;
//# sourceMappingURL=logger.js.map