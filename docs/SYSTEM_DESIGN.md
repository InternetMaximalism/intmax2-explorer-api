# INTMAX2 Explorer API - System Design

## 1. Overview

The INTMAX2 Explorer API provides a RESTful interface for querying blockchain data—including blocks, deposits, withdrawals, and statistics—on the INTMAX2 network. It comprises modular services for indexing, finalizing on-chain events, caching, rate limiting, and search functionality.

### 1.1 Project Structure

```txt
packages/
├── api/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   └── services/
│   └── package.json
├── finalizer/
│   ├── src/
│   │   └── service/
│   └── package.json
├── shared/
│   ├── src/
│   │   ├── abi/
│   │   ├── blockchain/
│   │   ├── config/
│   │   ├── db/
│   │   ├── lib/
│   │   ├── types/
│   │   └── validations/
│   └── package.json
└── watcher/
    ├── src/
    │   └── service/
    └── package.json
```

This mono-repo is organized under the `packages/` directory, with each package focusing on a distinct role:
- **api**: the HTTP server, routing, controllers, and middleware for client-facing requests.
- **watcher**: background job that listens to on-chain events and writes indexed data to Firestore.
- **finalizer**: background job that confirms and finalizes withdrawal events, updating their status in the database.
- **shared**: common types, utilities, and configuration shared across all packages.

## 2 High-Level Architecture

### 2.1 API

```txt
  ┌──────────┐       ┌──────────────┐
  │ Clients  │ ─────>│ Hono App     │
  └──────────┘       └──────────────┘
                             │
                             ▼
            ┌──────────────┐  ┌──────────────┐
            │ Cache Layer  │  │ Rate Limit   │
            └──────────────┘  └──────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                      Data Sources                           │
    │                                                             │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
    │  │  Firestore  │  │    Redis    │  │   RPC Provider      │  │
    │  └─────────────┘  └─────────────┘  └─────────────────────┘  │
    └─────────────────────────────────────────────────────────────┘
```

This API layer handles incoming client requests through the Hono framework, applying caching and rate limiting middleware.
It retrieves or stores blockchain data from Firestore, Redis, or directly via RPC providers as needed.
Clients receive fast, secure, and validated responses with minimal latency.

### 2.2 Watcher Job

```txt
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Watcher     │ ──>│ Fetch on-Chain  │ ──>│ Write to DB │
└─────────────┘    └─────────────────┘    └─────────────┘
                          │                  │
                          ▼                  ▼
                     RPC Provider         Firestore
```

The Watcher job runs continuously to monitor on-chain events (blocks, deposits, withdrawals). It fetches data from the RPC provider, parses and transforms events using shared utilities, and writes the structured records into Firestore to maintain an up-to-date index.

### 2.3 Finalizer Job

```txt
┌──────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Finalizer    │ ──>│ Fetch On-chain  │ ──>│ Update DB   │
└──────────────┘    └─────────────────┘    └─────────────┘
                           │                  │
                           ▼                  ▼
                     RPC Provider          Firestore
```

The Finalizer job periodically scans pending withdrawal entries stored in Firestore, fetches confirmation events on-chain via RPC calls, and updates the database with final statuses and timestamps, ensuring reliable completion tracking and consistency.

## 3. Components

### 3.1 Hono App & Job

- Entry point for HTTP requests. Uses Hono framework to route to middleware and controllers.
- Responsibilities: authentication (X-API-KEY), CORS, rate limiting, caching, request validation.

### 3.2 Stats Service

- Aggregates metrics: transaction count, market cap, TVL, etc.
- Exposes time-series and snapshot endpoints.

### 3.3 Indexer Service

- Continuously scans Ethereum events (blocks, deposits, withdrawals).
- Persists raw and aggregated data into Firestore.
- Ensures eventual consistency and replay support.

### 3.4 Search Service

- Provides unified search across blocks, deposits, and withdrawals by block number or hash.
- Prioritizes block matches, then deposits, then withdrawals.

### 3.5 Watcher Service

- Continuously monitors on-chain events (blocks, deposits, withdrawals) via RPC provider.
- Parses and transforms events using shared utilities.
- Writes structured records into Firestore to maintain an up-to-date index.

### 3.6 Finalizer Service

- Periodically finalizes relayed withdrawals by fetching on-chain events.
- Updates withdrawal records with final status and timestamps.
- Emits audit events to Firestore for monitoring.

### 3.6 Shared Library

- `@intmax2-explorer-api/shared` contains common constants, types, utilities: Firestore client, event parsing, logging, validation.

### 3.7 Cache & Persistence

- Redis for HTTP response caching (GET endpoints).
- Firestore as primary database for indexed blockchain data and event logs.

## 4. Data Flow

1. **Client Query**: API Gateway processes request, applies middleware, reads from cache or Firestore via services.
2. **Cache Miss**: If no cached response, compute data, store in Redis for subsequent requests.
3. **Block/Deposit/Withdrawal Events**: Indexer listens to new blocks and events, writes to Firestore.
4. **Finalize Withdrawals**: Finalizer reads pending withdrawals, fetches on-chain confirmations, updates status.

## 5. Scalability & Reliability

- **Stateless Services**: All services can scale horizontally behind a load balancer.
- **Eventual Consistency**: Indexer and finalizer jobs can be retried, idempotent.
- **Redis Caching**: Reduces read load on Firestore for popular queries.
- **Rate Limiting & API Keys**: Protects against abuse.
- **Health Checks & Monitoring**: `/health` endpoint and telemetry via structured logs.

## 6. Security

- **Authentication**: Authentication is handled via an API key passed in the `X-API-KEY` header.
This key includes scoped permissions and helps bypass rate limits for authorized access.
- **CORS**: Configurable whitelist of origins.
- **Input Validation**: Strict schema for query parameters; prevents injection.

## 7. CI/CD & Testing

- **Vitest** unit and integration tests coverage for services and middleware.
- **Tasks**: `yarn test`, `yarn check`, `yarn build` in CI pipeline.
- **Docker**: Containerized deployment using provided Dockerfile.

## 8. Observability

- **Structured Logging**: Centralized logs via `logger` utility.
- **Error Notifications**: Critical failures automatically trigger alerts through cloud-based monitoring services.
- **Metrics**: Tracks block processing latency and API performance. Statistics are regularly analyzed to identify trends, and slow queries or underperforming API endpoints are investigated for optimization.