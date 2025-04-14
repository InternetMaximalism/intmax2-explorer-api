# intmax2-explorer-api

The INTMAX2 Explorer API is designed to support the INTMAX2 Explorer, providing seamless and efficient access to blockchain data.

## Development

```sh
# install
yarn

# shared build
yarn build:shared

# api
yarn workspace api dev

# watcher
yarn workspace watcher dev
```

## Local Emulator

```sh
gcloud emulators firestore start
export FIRESTORE_EMULATOR_HOST="HOST:PORT"
```

## Docker

```sh
docker build -f docker/Dockerfile -t intmax2-explorer-api .
docker run --rm -p 3000:3000 --env-file .env intmax2-explorer-api workspace api start
```

## Docs

- [API Usage](./docs/api.md)