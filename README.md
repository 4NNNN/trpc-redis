# tRPC-Redis

A tRPC adapter for Redis. This allows you to use Redis pub/sub as a transport layer for tRPC.


### UPDATE: This package is now officially in the list of **Awesome tRPC Collection**, check out [now](https://trpc.io/docs/community/awesome-trpc)

## Installation

```bash
npm install trpc-redis
```

## Server-side usage

```typescript
import { initTRPC } from '@trpc/server';
import { createRedisHandler } from 'trpc-redis/adapter';
import { createRedis } from 'trpc-redis/lib/redis';

// Initialize your tRPC router
const t = initTRPC.create();
const router = t.router({
  // your procedures here
  hello: t.procedure.query(() => 'world')
});

export type AppRouter = typeof router;

// Create a Redis client
const redisClient = createRedis({
  host: 'localhost',
  port: 6379
});

// Create the Redis handler
const { subscriber } = createRedisHandler({
  client: redisClient,
  requestChannel: 'trpc/request',
  router: router
});

// Handle cleanup
process.on('SIGINT', () => {
  redisClient.quit();
  subscriber.quit();
});
```

## Client-side usage

```typescript
import { createTRPCProxyClient } from '@trpc/client';
import { createRedis } from 'trpc-redis/lib/redis';
import { redisLink } from 'trpc-redis/link';

import type { AppRouter } from './server';

// Create a Redis client
const redisClient = createRedis({
  host: 'localhost',
  port: 6379
});

// Create the tRPC client
const client = createTRPCProxyClient<AppRouter>({
  links: [
    redisLink({
      client: redisClient,
      requestChannel: 'trpc/request'
    })
  ]
});

// Example usage
async function main() {
  const result = await client.hello.query();
  console.log(result); // 'world'

  // Close the Redis client when done
  redisClient.quit();
}

main().catch(console.error);
```

## Configuration Options

### Redis Client Options

The `createRedis` function accepts all options from `ioredis`, plus:

- `enableOfflineQueue` - Whether to queue commands when connection is lost (default: `true`)
- `retryStrategy` - A function that receives the retry count and returns the milliseconds to wait before retrying

### Redis Handler Options

- `client` - Redis client instance
- `requestChannel` - The channel to subscribe to for requests
- `router` - Your tRPC router
- `onError` - A function to handle errors
- `verbose` - Whether to log debug information
- `createContext` - A function to create the request context

### Redis Link Options

- `client` - Redis client instance
- `requestChannel` - The channel to publish requests to
- `responseChannel` - The channel to subscribe to for responses (default: `${requestChannel}/response`)
- `requestTimeoutMs` - Timeout for requests in milliseconds (default: `5000`)

## License

MIT

## Acknowledgements

This project is based on the architecture of [trpc-rabbitmq](https://github.com/imxeno/trpc-rabbitmq) by [Piotr Adamczyk](https://github.com/imxeno) and [trpc-mqtt](https://github.com/edorgeville/trpc-mqtt).
