import { TRPCClientError, TRPCLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { randomUUID } from "crypto";
import EventEmitter from "events";

import type { RedisClient } from "../lib/redis";
import type {
  RedisChannelOptions,
  TRPCRedisRequest,
  TRPCRedisResponse,
} from "../types";

export type TRPCRedisLinkOptions = RedisChannelOptions & {
  client: RedisClient;
  requestTimeoutMs?: number;
};

export const redisLink = <TRouter extends AnyRouter>(
  opts: TRPCRedisLinkOptions
): TRPCLink<TRouter> => {
  // This runs once, at the initialization of the link
  return (runtime: any) => {
    const {
      client,
      requestChannel,
      responseChannel = `${requestChannel}/response`,
      requestTimeoutMs = 5000,
    } = opts;
    const responseEmitter = new EventEmitter();
    responseEmitter.setMaxListeners(0);

    // Create a duplicate connection for subscribing
    const subscriber = client.duplicate();

    subscriber.subscribe(responseChannel, (err) => {
      if (err) {
        console.error("Failed to subscribe to Redis response channel:", err);
        return;
      }
    });

    subscriber.on("message", (channel, message) => {
      if (responseChannel !== channel) return; // Ignore messages not on the response channel
      try {
        const parsed = JSON.parse(message);
        const { correlationId } = parsed;
        if (correlationId === undefined) return;
        responseEmitter.emit(correlationId, parsed);
      } catch (err) {
        console.error("Error parsing Redis response:", err);
      }
    });

    return ({ op }) => {
      // This runs every time a procedure is called
      return observable((observer) => {
        const abortController = new AbortController();

        const { path, input, type } = op;
        const id = op.id;

        const { transformer } = runtime as any;

        const message: TRPCRedisRequest = {
          trpc: {
            id,
            method: type,
            params: {
              path,
              input:
                input !== undefined ? transformer.serialize(input) : undefined,
            },
          },
        };

        const request = async (
          message: TRPCRedisRequest,
          signal: AbortSignal
        ) =>
          new Promise<any>((resolve, reject) => {
            const correlationId = randomUUID();
            const onTimeout = () => {
              responseEmitter.off(correlationId, onMessage);
              signal.onabort = null;
              reject(
                new TRPCClientError(
                  "Request timed out after " + requestTimeoutMs + "ms"
                )
              );
            };
            const onAbort = () => {
              // This runs when the request is aborted externally
              clearTimeout(timeout);
              responseEmitter.off(correlationId, onMessage);
              reject(new TRPCClientError("Request aborted"));
            };
            const timeout = setTimeout(onTimeout, requestTimeoutMs);
            signal.onabort = onAbort;
            const onMessage = (message: TRPCRedisResponse) => {
              clearTimeout(timeout);
              resolve(message);
            };
            responseEmitter.once(correlationId, onMessage);

            // Send the message with correlationId and responseChannel
            client.publish(
              requestChannel,
              JSON.stringify({
                ...message,
                correlationId,
                responseChannel,
              })
            );
          });

        request(message, abortController.signal)
          .then((rawResponse) => {
            if ("error" in rawResponse.trpc) {
              observer.error(TRPCClientError.from(rawResponse.trpc.error));
              return null;
            }

            observer.next({
              result: {
                ...rawResponse.trpc.result,
                ...(rawResponse.trpc.result?.data != null && {
                  data: transformer.deserialize(rawResponse.trpc.result.data),
                }),
              },
            });
            observer.complete();
            return null;
          })
          .catch((cause) => {
            observer.error(
              cause instanceof TRPCClientError
                ? cause
                : new TRPCClientError(
                    cause instanceof Error ? cause.message : "Unknown error"
                  )
            );
          });

        return () => {
          abortController.abort();
        };
      });
    };
  };
};
