import { createTRPCProxyClient } from '@trpc/client';

import { createRedisHandler } from '../src/adapter';
import { createRedis } from '../src/lib/redis';
import { redisLink } from '../src/link';
import { type AppRouter, appRouter, createContext } from './appRouter';

export function factory() {
  const requestChannel = 'rpc/request';

  // Create Redis clients for server and client
  const redisClient = createRedis({
    host: '127.0.0.1',
    port: 6379
  });

  const { subscriber } = createRedisHandler({
    client: redisClient,
    requestChannel,
    router: appRouter,
    createContext
  });

  const client = createTRPCProxyClient<AppRouter>({
    links: [
      redisLink({
        client: redisClient,
        requestChannel
      })
    ]
  });

  return {
    client,
    redisClient,
    async ready() {
      // Wait for Redis client to be ready
      if (!redisClient.status || redisClient.status !== 'ready') {
        await new Promise<void>(resolve => {
          redisClient.once('ready', () => {
            resolve();
          });
        });
      }
    },
    close() {
      redisClient.quit();
      subscriber.quit();
    }
  };
}

export async function withFactory(fn: (f: ReturnType<typeof factory>) => Promise<void>) {
  const f = factory();
  await f.ready();
  try {
    await fn(f);
  } catch (e) {
    console.error(e);
  } finally {
    f.close();
  }
}
