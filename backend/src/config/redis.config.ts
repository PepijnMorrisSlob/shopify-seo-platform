import { Redis } from 'ioredis';

/**
 * Redis Connection Configuration
 * Used by BullMQ queues
 */

let redisConnection: Redis | null = null;

export const getRedisConnection = (): any => {
  if (!redisConnection) {
    redisConnection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false, // Required for BullMQ
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisConnection.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redisConnection.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  // Type cast to any to avoid BullMQ/ioredis version mismatch
  // BullMQ bundles its own ioredis version which causes type conflicts
  return redisConnection as any;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
};
