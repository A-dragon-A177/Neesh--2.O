import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    base: { service: 'neesh-ai-service' },
    timestamp: pino.stdTimeFunctions.isoTime,
});
