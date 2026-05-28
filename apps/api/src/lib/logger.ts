/**
 * Social Planner - Logger
 *
 * Pino-based structured logging.
 */

import pino, { LoggerOptions } from 'pino';
import { config } from '../config';

const loggerOptions: LoggerOptions = {
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    service: 'planner-api',
  },
  redact: ['req.headers.authorization', 'password', 'accessToken', 'refreshToken'],
};

// Add transport for pretty printing in development
if (config.NODE_ENV !== 'production') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  };
}

export const logger = pino(loggerOptions);
