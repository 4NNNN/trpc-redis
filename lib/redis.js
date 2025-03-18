"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
function createRedis(params = {}) {
    const defaultOptions = Object.assign({ enableOfflineQueue: true, retryStrategy: times => {
            // Retry with exponential backoff capped at 30 seconds
            return Math.min(times * 50, 30000);
        } }, params);
    const client = new ioredis_1.default(defaultOptions);
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
exports.createRedis = createRedis;
//# sourceMappingURL=redis.js.map