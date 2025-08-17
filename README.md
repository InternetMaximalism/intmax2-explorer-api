# intmax2-explorer-api

The INTMAX2 Explorer API is designed to support the INTMAX2 Explorer, providing seamless and efficient access to blockchain data.

## Setup

Before running any service, make sure to:

```sh
# Install dependencies
yarn

# Copy environment variables
cp .env.example .env

# Build shared packages
yarn build:shared
```

## Development

Start the API or watcher service in development mode:

```sh
# api
yarn workspace api dev

# watcher
yarn workspace watcher dev

# finalizer
yarn workspace finalizer dev
```

## Local Emulator

If your development workflow involves Firestore, you can start a local emulator:

```sh
gcloud emulators firestore start

# Set the FIRESTORE_EMULATOR_HOST variable in the same terminal where you will run your application.
export FIRESTORE_EMULATOR_HOST="HOST:PORT"
```

## Docker

Build and run the project in a Docker container:

```sh
docker build -f docker/Dockerfile -t intmax2-explorer-api .
docker run --rm -p 3000:3000 --env-file .env intmax2-explorer-api workspace api start
```

## Redis

Run Redis in a Docker container with data persistence enabled.

```sh
docker run -d --rm \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis redis-server --appendonly yes
```

## Testing

The project uses Vitest for testing. Run tests with the following commands:

```sh
# Run all tests
yarn test

# Run tests in watch mode
yarn test --watch

# Run tests with coverage report
yarn coverage
```

## X-API-KEY

The API uses API keys for authentication and rate limiting. To generate a secure API key for development or production use:

```sh
node -e "console.log('ak_' + require('crypto').randomBytes(32).toString('base64url'))"
```

## Docs

See the documentation for details on available endpoints and how to use the API.
This guide will help you integrate INTMAX2 blockchain data into your applications.

- [SYSTEM Design](./docs/SYSTEM_DESIGN.md)
- [API Usage](./docs/API.md)
- [ENV](./packages/shared/src/config/index.ts)

## Explorers

Use the following explorers to browse blocks, transactions, and other on-chain data:

- [Mainnet Explorer](https://explorer.intmax.io)
- [Testnet Explorer](https://beta.testnet.explorer.intmax.io)
