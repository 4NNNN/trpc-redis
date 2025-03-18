import Redis, { type RedisOptions } from 'ioredis';

export interface RedisClientOptions extends RedisOptions {
  enableOfflineQueue?: boolean;
  retryStrategy?: (times: number) => number | null;
}

export function createRedis(params: RedisClientOptions = {}) {
  const defaultOptions: RedisClientOptions = {
    enableOfflineQueue: true,
    retryStrategy: times => {
      // Retry with exponential backoff capped at 30 seconds
      return Math.min(times * 50, 30000);
    },
    ...params
  };

  const client = new Redis(defaultOptions);

  client.on('error', err => {
    console.error('Redis connection error:', err);
  });

  client.on('connect', () => {
    console.log('Redis client connected');
  });

  client.on('reconnecting', () => {
    console.log('Redis client reconnecting');
  });

  return client;
}

export type RedisClient = ReturnType<typeof createRedis>;
