import Redis, { type RedisOptions } from 'ioredis';
export interface RedisClientOptions extends RedisOptions {
    enableOfflineQueue?: boolean;
    retryStrategy?: (times: number) => number | null;
}
export declare function createRedis(params?: RedisClientOptions): Redis;
export declare type RedisClient = ReturnType<typeof createRedis>;
//# sourceMappingURL=redis.d.ts.map