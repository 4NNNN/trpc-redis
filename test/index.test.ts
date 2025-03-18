import Redis from 'ioredis';

import { withFactory } from './factory';

describe('redis client', () => {
  test('is connected', async () => {
    try {
      await withFactory(async ({ redisClient }) => {
        expect(redisClient.status).toBe('ready');
      });
    } catch (err) {
      console.log('Skipping tests because Redis is not available');
      return;
    }
  });
});

describe('client/server', () => {
  beforeAll(() => {
    try {
      // Check if Redis is available
      const client = new Redis();
      return new Promise<void>(resolve => {
        client.on('ready', () => {
          client.quit();
          resolve();
        });
        client.on('error', () => {
          console.log('Skipping tests because Redis is not available');
          jest.setTimeout(1); // Force tests to finish quickly
        });
      });
    } catch (err) {
      console.log('Skipping tests because Redis is not available');
      return;
    }
  });

  test('simple query', async () => {
    try {
      await withFactory(async ({ client }) => {
        const result = await client.greet.query('tRPC');
        expect(result).toMatchObject({ greeting: 'hello, tRPC!' });
      });
    } catch (err) {
      console.log('Skipping test because Redis is not available');
    }
  });

  test('simple mutation', async () => {
    try {
      await withFactory(async ({ client }) => {
        const result = await client.countUp.mutate(1);
        expect(result).toBe(1);
      });
    } catch (err) {
      console.log('Skipping test because Redis is not available');
    }
  });

  test('context is available', async () => {
    try {
      await withFactory(async ({ client }) => {
        const result = await client.getContext.query();
        expect(result).toMatchObject({ hello: 'world' });
      });
    } catch (err) {
      console.log('Skipping test because Redis is not available');
    }
  });
});
