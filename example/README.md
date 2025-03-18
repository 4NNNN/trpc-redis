# tRPC-Redis Example: Client-Server Separation

This example demonstrates how to use the tRPC-Redis adapter with clear separation between client and server components.

## Overview

This example implements a simple Todo application with basic CRUD operations:

- List all todos
- Get a specific todo by ID
- Add a new todo
- Toggle the completion status of a todo

## Files

- `server.ts`: The server-side implementation using tRPC with Redis as the transport layer
- `client.ts`: The client-side implementation that connects to the server through Redis

## Prerequisites

- Node.js 14+ installed
- Redis server running on localhost:6379 (or update the connection details in both files)

You can start Redis using Docker with the included docker-compose.yml:

```bash
docker-compose up -d
```

## Running the Example

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npx ts-node example/server.ts
```

3. In another terminal, run the client:

```bash
npx ts-node example/client.ts
```

## Key Architecture Points

### Server-Side (server.ts)

- Creates a Redis connection
- Defines the tRPC router with procedures
- Sets up a context factory for authentication/session info
- Initializes the Redis handler to listen for client requests
- Processes incoming requests and returns responses through Redis

### Client-Side (client.ts)

- Creates a Redis connection
- Configures the tRPC client with the Redis link
- Makes procedure calls that are sent over Redis
- Handles responses returned from the server

## How It Works

1. The server subscribes to a Redis channel for incoming requests
2. The client publishes procedure calls to that channel
3. When the server receives a request, it:
   - Processes the tRPC procedure
   - Publishes the result back to a response channel
4. The client is subscribed to the response channel and receives the result

This architecture allows for:

- Completely decoupled server and client components
- Horizontal scaling of servers
- Language-agnostic clients (any language that can use Redis)
- Low latency communication
