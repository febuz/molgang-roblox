/**
 * Logger - Structured logging for the system
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;

const logger = {
  debug: (msg: string, data?: any) => {
    if (LOG_LEVELS.debug >= LOG_LEVELS[currentLevel]) {
      console.debug(`[DEBUG] ${msg}`, data || '');
    }
  },
  info: (msg: string, data?: any) => {
    if (LOG_LEVELS.info >= LOG_LEVELS[currentLevel]) {
      console.log(`[INFO] ${msg}`, data || '');
    }
  },
  warn: (msg: string, data?: any) => {
    if (LOG_LEVELS.warn >= LOG_LEVELS[currentLevel]) {
      console.warn(`[WARN] ${msg}`, data || '');
    }
  },
  error: (msg: string, error?: any) => {
    if (LOG_LEVELS.error >= LOG_LEVELS[currentLevel]) {
      console.error(`[ERROR] ${msg}`, error || '');
    }
  }
};

export default logger;
