import { createTRPCProxyClient } from '@trpc/client';

import { createRedis } from '../src/lib/redis';
import { redisLink } from '../src/link';
import type { AppRouter } from './server';

async function main() {
  console.log('Starting tRPC Redis client...');

  // Create Redis client
  const redisClient = createRedis({
    host: '127.0.0.1',
    port: 6379
  });

  // Set up request channel (must match server's channel)
  const requestChannel = 'todos/request';

  // Create tRPC client
  const client = createTRPCProxyClient<AppRouter>({
    links: [
      redisLink({
        client: redisClient,
        requestChannel,
        // Optional: customize response timeout (default is 5000ms)
        requestTimeoutMs: 10000
      })
    ]
  });

  try {
    // Wait for Redis client to be ready
    await new Promise<void>((resolve, reject) => {
      if (redisClient.status === 'ready') {
        resolve();
      } else {
        redisClient.once('ready', resolve);
        redisClient.once('error', reject);
      }
    });

    console.log('Connected to Redis. Running example operations...');

    // Example 1: Query all todos
    console.log('\n--- Fetching all todos ---');
    const todos = await client.getTodos.query();
    console.log('Todos:', todos);

    // Example 2: Query a specific todo
    console.log('\n--- Fetching todo with ID 1 ---');
    const todo = await client.getTodo.query('1');
    console.log('Todo:', todo);

    // Example 3: Add a new todo
    console.log('\n--- Adding a new todo ---');
    const newTodo = await client.addTodo.mutate('Learn Redis with tRPC');
    console.log('Added todo:', newTodo);

    // Example 4: Toggle a todo's completion status
    console.log('\n--- Toggling todo completion ---');
    const toggledTodo = await client.toggleTodo.mutate(newTodo.id);
    console.log('Toggled todo:', toggledTodo);

    // Example 5: Fetch all todos again to see changes
    console.log('\n--- Fetching all todos (after changes) ---');
    const updatedTodos = await client.getTodos.query();
    console.log('Updated todos:', updatedTodos);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up Redis connection
    console.log('\nShutting down client...');
    redisClient.quit();
  }
}

// Run the client if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
