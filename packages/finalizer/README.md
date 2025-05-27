# finalizer

The finalizer package is responsible for processing and finalizing indexed data.
It takes data collected by the indexer (or watcher), validates and confirms its integrity, and persists it as finalized records in the database.
This step ensures that only confirmed and accurate data is available for downstream applications and APIs.

## Usage

To set up the development environment:

```bash
# install
yarn

# dev
yarn workspace finalizer dev

# build
yarn build
```
