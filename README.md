# intmax2-explorer-api

The INTMAX2 Explorer API is designed to support the INTMAX2 Explorer, providing seamless and efficient access to blockchain data.

## Development

Start the API or watcher service in development mode:

```sh
# install
yarn

# shared build
yarn build:shared

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
export FIRESTORE_EMULATOR_HOST="HOST:PORT"
```

## Docker

Build and run the project in a Docker container:

```sh
docker build -f docker/Dockerfile -t intmax2-explorer-api .
docker run --rm -p 3000:3000 --env-file .env intmax2-explorer-api workspace api start
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

- [API Usage](./docs/api.md)