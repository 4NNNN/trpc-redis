import {
  AnyRouter,
  ProcedureType,
  TRPCError,
  callProcedure,
  inferRouterContext
} from '@trpc/server';
import type { OnErrorFunction } from '@trpc/server/dist/internals/types';

import type { RedisClient } from '../lib/redis';
import { getErrorFromUnknown } from './errors';

// import * as amqp from 'amqp-connection-manager';
type ConsumeMessage = string;

const REDIS_METHOD_PROCEDURE_TYPE_MAP: Record<string, ProcedureType | undefined> = {
  query: 'query',
  mutation: 'mutation'
};

export type CreateRedisHandlerOptions<TRouter extends AnyRouter> = {
  client: RedisClient;
  requestChannel: string;
  responseChannel?: string;
  router: TRouter;
  onError?: OnErrorFunction<TRouter, ConsumeMessage>;
  verbose?: boolean;
  createContext?: () => Promise<inferRouterContext<TRouter>>;
};

export const createRedisHandler = <TRouter extends AnyRouter>(
  opts: CreateRedisHandlerOptions<TRouter>
) => {
  const {
    client,
    requestChannel,
    responseChannel = `${requestChannel}/response`,
    router,
    onError,
    verbose,
    createContext
  } = opts;

  const subscriber = client.duplicate();

  subscriber.subscribe(requestChannel, err => {
    if (err) {
      console.error('Failed to subscribe to Redis channel:', err);
      return;
    }
    if (verbose) console.log(`Subscribed to Redis channel: ${requestChannel}`);
  });

  subscriber.on('message', async (channel, message) => {
    if (channel !== requestChannel) return;
    if (verbose) console.log(channel, message);
    if (!message) return;

    try {
      const parsed = JSON.parse(message);
      const { trpc, correlationId, responseChannel: msgResponseChannel } = parsed;

      if (!trpc || !correlationId || !msgResponseChannel) return;

      const res = await handleMessage(router, message, onError, createContext);
      if (!res) return;

      client.publish(
        msgResponseChannel,
        JSON.stringify({
          trpc: res,
          correlationId
        })
      );
    } catch (err) {
      console.error('Error processing Redis message:', err);
    }
  });

  return { subscriber, client };
};

async function handleMessage<TRouter extends AnyRouter>(
  router: TRouter,
  msg: ConsumeMessage,
  onError?: OnErrorFunction<TRouter, ConsumeMessage>,
  createContext?: () => Promise<inferRouterContext<TRouter>>
) {
  const { transformer } = router._def._config;

  try {
    const message = JSON.parse(msg);
    if (!('trpc' in message)) return;
    const { trpc } = message;
    if (!('id' in trpc) || trpc.id === null || trpc.id === undefined) return;
    if (!trpc) return;

    const { id, params } = trpc;
    const type = REDIS_METHOD_PROCEDURE_TYPE_MAP[trpc.method] ?? ('query' as const);
    const ctx: inferRouterContext<TRouter> | undefined = await createContext?.();

    try {
      const path = params.path;

      if (!path) {
        throw new Error('No path provided');
      }

      if (type === 'subscription') {
        throw new TRPCError({
          message: 'Redis link does not support subscriptions (yet?)',
          code: 'METHOD_NOT_SUPPORTED'
        });
      }

      const deserializeInputValue = (rawValue: unknown) => {
        return typeof rawValue !== 'undefined' ? transformer.input.deserialize(rawValue) : rawValue;
      };

      const input = deserializeInputValue(params.input);

      const output = await callProcedure({
        procedures: router._def.procedures,
        path,
        rawInput: input,
        ctx,
        type
      });

      return {
        id,
        result: {
          type: 'data',
          data: output
        }
      };
    } catch (cause) {
      const error = getErrorFromUnknown(cause);
      onError?.({
        error,
        type,
        path: trpc?.path,
        input: trpc?.input,
        ctx,
        req: msg
      });

      return {
        id,
        error: router.getErrorShape({
          error,
          type,
          path: trpc?.path,
          input: trpc?.input,
          ctx
        })
      };
    }
  } catch (cause) {
    const error = getErrorFromUnknown(cause);
    onError?.({
      error,
      type: 'unknown',
      path: undefined,
      input: undefined,
      ctx: undefined,
      req: msg
    });
    return;
  }
}
