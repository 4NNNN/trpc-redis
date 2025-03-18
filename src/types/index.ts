import type {
  TRPCClientOutgoingMessage,
  TRPCErrorResponse,
  TRPCRequest,
  TRPCResultMessage
} from '@trpc/server/rpc';

export type TRPCRedisRequest = {
  trpc: TRPCRequest | TRPCClientOutgoingMessage;
};

export type TRPCRedisSuccessResponse = {
  trpc: TRPCResultMessage<any>;
};

export type TRPCRedisErrorResponse = {
  trpc: TRPCErrorResponse;
};

export type TRPCRedisResponse = TRPCRedisSuccessResponse | TRPCRedisErrorResponse;

// Redis-specific types
export type RedisChannelOptions = {
  requestChannel: string;
  responseChannel?: string;
};
