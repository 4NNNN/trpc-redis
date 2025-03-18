import { initTRPC } from '@trpc/server';

import { createRedisHandler } from '../src/adapter';
import { createRedis } from '../src/lib/redis';

// Define context type
export interface Context {
  userId: string;
}

// Create a context factory function
export const createContext = async (): Promise<Context> => {
  // In a real application, you might get user info from a session or token
  return {
    userId: 'user-123'
  };
};

// Initialize tRPC
const t = initTRPC.context<Context>().create();
const publicProcedure = t.procedure;
const router = t.router;

// Create a simple in-memory database for the example
const db = {
  todos: [
    { id: '1', text: 'Learn tRPC', completed: false },
    { id: '2', text: 'Build something awesome', completed: false }
  ]
};

// Define your router with procedures
export const appRouter = router({
  // Query to get all todos
  getTodos: publicProcedure.query(() => {
    return db.todos;
  }),

  // Query to get a specific todo by ID
  getTodo: publicProcedure
    .input((val: unknown) => {
      if (typeof val === 'string') return val;
      throw new Error(`Invalid input: ${typeof val}`);
    })
    .query(({ input }) => {
      const todo = db.todos.find(todo => todo.id === input);
      if (!todo) throw new Error(`Todo with ID "${input}" not found`);
      return todo;
    }),

  // Mutation to add a new todo
  addTodo: publicProcedure
    .input((val: unknown) => {
      if (typeof val === 'string') return val;
      throw new Error(`Invalid input: ${typeof val}`);
    })
    .mutation(({ input, ctx }) => {
      const newTodo = {
        id: `${db.todos.length + 1}`,
        text: input,
        completed: false
      };

      db.todos.push(newTodo);
      console.log(`User ${ctx.userId} added todo: ${input}`);
      return newTodo;
    }),

  // Mutation to toggle the completed status of a todo
  toggleTodo: publicProcedure
    .input((val: unknown) => {
      if (typeof val === 'string') return val;
      throw new Error(`Invalid input: ${typeof val}`);
    })
    .mutation(({ input }) => {
      const todo = db.todos.find(todo => todo.id === input);
      if (!todo) throw new Error(`Todo with ID "${input}" not found`);

      todo.completed = !todo.completed;
      return todo;
    })
});

// Export type definition of API
export type AppRouter = typeof appRouter;

// Start the server
if (require.main === module) {
  console.log('Starting tRPC Redis server...');

  // Create Redis client
  const redisClient = createRedis({
    host: '127.0.0.1',
    port: 6379
  });

  // Set up request channel
  const requestChannel = 'todos/request';

  // Create Redis handler
  const { subscriber } = createRedisHandler({
    client: redisClient,
    requestChannel,
    router: appRouter,
    createContext,
    verbose: true
  });

  console.log(`Server listening on Redis channel: ${requestChannel}`);

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('Shutting down server...');
    redisClient.quit();
    subscriber.quit();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
