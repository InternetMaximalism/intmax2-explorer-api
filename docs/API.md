# INTMAX2 Explorer API Documentation

## Overview

The INTMAX2 Explorer API provides RESTful endpoints for querying blockchain data including blocks, deposits, withdrawals, statistics, and search functionality. All endpoints return JSON responses and support pagination where applicable.

## Base URL

```
Local: http://localhost:3000
```

## Example Usage

```bash
export ENDPOINT='http://localhost:3000'

# health
curl -i --location --request GET "$ENDPOINT/v1/health"
curl -i -H "X-API-KEY: dummy" --location --request GET "$ENDPOINT/v1/health/redis"

# stats
curl -i --location --request GET "$ENDPOINT/v1/stats"

# search(block number, block hash, deposit hash, withdrawal hash)
curl -i --location --request GET "$ENDPOINT/v1/search?query=0x"

# blocks(block hash)
curl -i --location --request GET "$ENDPOINT/v1/blocks"
curl -i --location --request GET "$ENDPOINT/v1/blocks?perPage=50&cursor=0x"

# block detail(block bash)
curl -i --location --request GET "$ENDPOINT/v1/blocks/0x"

# block validity proof
curl -i --location --request GET "$ENDPOINT/v1/blocks/100/validityProof"

# deposits(deposit hash)
curl -i --location --request GET "$ENDPOINT/v1/deposits"
curl -i --location --request GET "$ENDPOINT/v1/deposits?perPage=50&cursor=0x"
curl -i --location --request GET "$ENDPOINT/v1/deposits?tokenType=1&status=Completed"

# deposit detail(deposit hash)
curl -i --location --request GET "$ENDPOINT/v1/deposits/0x"

# withdrawals(withdrawal hash)
curl -i --location --request GET "$ENDPOINT/v1/withdrawals"
curl -i --location --request GET "$ENDPOINT/v1/withdrawals?perPage=50&cursor=0x"
curl -i --location --request GET "$ENDPOINT/v1/withdrawals?tokenType=1&status=Completed"

# withdrawal detail(withdrawal hash)
curl -i --location --request GET "$ENDPOINT/v1/withdrawals/0x"
```

## Common Response Format

### Pagination

List endpoints support **cursor-based pagination**.

#### Request Parameters

| Parameter | Type   | Required | Description                                                                 |
| --------- | ------ | -------- | --------------------------------------------------------------------------- |
| `perPage` | number | No       | Number of items per page (1–250). Defaults to **50** if not provided.       |
| `cursor`  | string | No       | Cursor for pagination. Use the `nextCursor` value returned from the API.    |

#### Success Response

All successful **list responses** follow this structure:

```json
{
  "items": [...],
  "totalCount": 1234,
  "hasMore": true,
  "nextCursor": "0x..."
}
```

**Response Fields**

| Field        | Type    | Description                                                                                  |
| ------------ | ------- | -------------------------------------------------------------------------------------------- |
| `items`      | array   | The array of returned data objects (e.g., blocks, deposits, withdrawals).                    |
| `totalCount` | number  | The total number of items matching the query, across all pages.                              |
| `hasMore`    | boolean | Indicates whether additional pages of data are available.                                    |
| `nextCursor` | string  | Opaque cursor (hex string). Use this value as the `cursor` parameter to fetch the next page. |

### Error Response

All error responses follow a consistent structure.

**Response:**

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation Error"
  "errors": [
    {
      "message": "Hash must be a valid 32-byte hex string starting with 0x",
      "path": "hash"
    }
  ],
}
```

**Response Fields**

| Field     | Type        | Description                                                                                                                                                                          |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `code`    | string      | Machine-readable error code (e.g., `"NOT_FOUND"`, `"UNAUTHORIZED"`, `"VALIDATION_ERROR"`).                                                                                           |
| `message` | string      | Human-readable explanation of the error. Safe to display in logs or UI for debugging context.                                                                                        |
| `errors`  | array\|null | *(Optional)* Detailed list of validation errors, if applicable. Each item includes: <br>• `message`: description of the issue <br>• `path`: field or parameter related to the error. |


## API Endpoints

### Health Check

#### GET /v1/health

Check API service health status.

**Response:**

```json
{
  "application": {
    "version": "1.0.11"
  },
  "status": "OK",
  "timestamp": "2025-08-18T23:01:22.458Z"
}
```

**Response Fields**

| Field         | Type   | Description                                   |
| ------------- | ------ | --------------------------------------------- |
| `application` | object | Application information                       |
| `version`     | string | Current version of the API service           |
| `status`      | string | Health status, typically "OK" when healthy   |
| `timestamp`   | string | ISO 8601 timestamp of the health check       |

#### GET /v1/health/redis

Check Redis connection status (requires API key).

**Headers:**
- `X-API-KEY`: Required

**Response:**
```json
{
  "status": "OK",
  "redis": "connected",
  "error": "optional error message"
}
```

**Response Fields**

| Field     | Type   | Description                                                                                   |
| --------- | ------ | --------------------------------------------------------------------------------------------- |
| `status`  | string | Overall health status of the Redis check. Usually `"OK"` if the service is reachable.          |
| `redis`   | string | Redis connection state. Typically `"connected"` when healthy, may report `"unreachable"`.     |
| `error`   | string | Optional error message if the Redis service cannot be reached or if a connection issue occurs. |

### Statistics

#### GET /v1/stats

Get network statistics and metrics.

**Response:**

```json
{
  "latestBlockNumber": 12345,
  "totalBlockBuilderCount": 7,
  "totalEthDepositAmount": "1234567890000000000000",
  "totalL1WalletCount": 1000,
  "totalL2WalletCount": 2500,
  "totalTransactionCount": 7890,
  "tvl": 456789.123456789
}
```

**Response Fields**

| Field                    | Type   | Description                                                                                                                          |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `latestBlockNumber`      | number | The most recent block number processed by the **INTMAX network**.                                                                    |
| `totalBlockBuilderCount` | number | The total number of unique block builders that have participated in the **INTMAX network**.                                          |
| `totalEthDepositAmount`  | string | The cumulative amount of ETH deposited into the **INTMAX network** (string format for handling large numbers/decimals).              |
| `totalL1WalletCount`     | number | The number of unique Layer 1 wallets that have interacted with the **INTMAX network**.                                               |
| `totalL2WalletCount`     | number | The number of unique Layer 2 wallets created or active in the **INTMAX network**.                                                    |
| `totalTransactionCount`  | number | The total number of transactions recorded on Layer 2 of the **INTMAX network**.                                                      |
| `tvl`                    | number | Total Value Locked (TVL) in **ETH only**, representing all ETH currently locked in the liquidity contract of the **INTMAX network**. |


### Search

#### GET /v1/search
Search for blocks, deposits, or withdrawals by block number or hash.

**Query Parameters:**
- `query` (required): Block number or hash (hex string starting with 0x)

**Examples:**
```bash
# Search by block number
curl "https://api.explorer.intmax.io/v1/search?query=100"

# Search by hash
curl "https://api.explorer.intmax.io/v1/search?query=0x1234..."
```

**Response:**
Returns the matching block, deposit, or withdrawal object based on priority (blocks > deposits > withdrawals).

**Response Fields**

The response structure depends on the type of object found:

- **Block Result**: Returns a block object (see Blocks section for fields)
- **Deposit Result**: Returns a deposit object (see Deposits section for fields)
- **Withdrawal Result**: Returns a withdrawal object (see Withdrawals section for fields)

If no match is found, returns a following object.

```json
{
  "item": null,
  "type": "not_found"
}
```

### Blocks

#### GET /v1/blocks
List blocks with optional filtering and pagination.

**Query Parameters:**
- `perPage` (optional): Items per page (1-250)
- `cursor` (optional): Pagination cursor
- `blockType` (optional): Block type filter (`Type0`, `Type1`, `Type2`)
- `blockValidity` (optional): Block validity (`Valid`, `Invalid`, `Empty`)

**Response:**
```json
{
  "items": [
    {
      "blockAggregatorSignature": ["0xdef0..."],
      "blockNumber": 100,
      "blockType": "Type0",
      "blockValidity": "Valid",
      "builderAddress": "0xabcd...",
      "hash": "0x1234...",
      "rollupTransactionHash": "0x5678...",
      "status": "Completed",
      "timestamp": 1640995200,
      "transactionCount": 5,
      "transactionDigest": "0x9abc..."
    }
  ],
  "totalCount": 1000,
  "hasMore": true,
  "nextCursor": "0x..."
}
```

**Response Fields**

| Field                      | Type      | Description                                                       |
| -------------------------- | --------- | ----------------------------------------------------------------- |
| `blockAggregatorSignature` | string[]  | Array of aggregator signatures for the block (hex strings)        |
| `blockNumber`              | number    | Sequential block number in the blockchain                         |
| `blockType`                | string    | Type of the block (e.g., `Type0`, `Type1`, `Type2`)               |
| `blockValidity`            | string    | Block validation result (`Valid`, `Invalid`, `Empty`, `Pending`)  |
| `builderAddress`           | string    | Address of the block builder (hex string)                         |
| `hash`                     | string    | Unique block hash (hex string starting with 0x)                   |
| `rollupTransactionHash`    | string    | Hash of the rollup transaction containing this block (hex string) |
| `status`                   | string    | Block processing status (`Indexing`, `Proving`, `Completed`)      |
| `timestamp`                | number    | Unix timestamp when the block was created                         |
| `transactionCount`         | number    | Number of transactions included in the block                      |
| `transactionDigest`        | string    | Digest of all transactions in the block (hex string)              |

#### GET /v1/blocks/{hash}
Get detailed information for a specific block.

**Path Parameters:**
- `hash`: Block hash (hex string starting with 0x)

**Response:**
Returns a single block object with the same structure as above.

**Response Fields**

Same as the `items` array fields from GET /v1/blocks (single block object without pagination fields).

#### GET /v1/blocks/{hash}/validityProof
Get validity proof for a specific block.

**Path Parameters:**
- `hash`: Block Hash

**Response:**
```json
{
  "proof": "..."
}
```

**Response Fields**

| Field         | Type    | Description                                      |
| ------------- | ------- | ------------------------------------------------ |
| `proof`       | object  | Cryptographic validity proof                     |

### Deposits

#### GET /v1/deposits
List deposits with optional filtering and pagination.

**Query Parameters:**
- `perPage` (optional): Items per page (1-250)
- `cursor` (optional): Pagination cursor
- `tokenType` (optional): Token type (`0`, `1`, `2`, `3`)
- `status` (optional): Deposit status (`Indexing`, `Relayed`, `Rejected`, `Completed`)

**Response:**
```json
{
  "items": [
    {
      "amount": "1000000000000000000",
      "blockNumber": 100,
      "depositId": 1000,
      "hash": "0x1234...",
      "sender": "0xef12....",
      "status": "Completed",
      "timestamp": 1640995200,
      "tokenIndex": "0",
      "tokenType": 0,
    }
  ],
  "totalCount": 250,
  "hasMore": true,
  "nextCursor": "0x..."
}
```

**Response Fields**

| Field         | Type    | Description                                                              |
| ------------- | ------- | ------------------------------------------------------------------------ |
| `amount`      | string  | Deposit amount in wei (string format for large numbers)                  |
| `blockNumber` | number  | Block number where the deposit was included                              |
| `depositId`   | number  | Unique identifier assigned to the deposit                                |
| `hash`        | string  | Unique deposit hash (hex string starting with 0x)                        |
| `sender`      | string  | Address of the user who made the deposit (hex string)                    |
| `status`      | string  | Deposit status (`Indexing`, `Relayed`, `Rejected`, `Completed`)          |
| `timestamp`   | number  | Unix timestamp when the deposit was made                                 |
| `tokenIndex`  | string  | Index of the deposited token in the supported token list (string format) |
| `tokenType`   | number  | Token type identifier (0: ETH, 1–3: ERC-20 variants, etc.)               |

#### GET /v1/deposits/{hash}
Get detailed information for a specific deposit.

**Path Parameters:**
- `hash`: Deposit hash (hex string starting with 0x)

**Response:**
Returns a single deposit object with the same structure as above.

**Response Fields**

Same as the `items` array fields from GET /v1/deposits (single deposit object without pagination fields).

### Withdrawals

#### GET /v1/withdrawals
List withdrawals with optional filtering and pagination.

**Query Parameters:**
- `perPage` (optional): Items per page (1-250)
- `cursor` (optional): Pagination cursor
- `tokenType` (optional): Token type (`0`, `1`, `2`, `3`)
- `status` (optional): Withdrawal status (`Indexing`, `Relayed`, `Rejected`, `Completed`)

**Response:**
```json
{
  "items": [
    {
      "amount": "500000000000000000",
      "hash": "0x1234...",
      "liquidityTimestamp": 1640995300,
      "liquidityTransactionHash": "0x9abc...",
      "recipient": "0xef12...",
      "relayedTimestamp": 1640995300,
      "relayedTransactionHash": "0x9abc...",
      "status": "Completed",
      "tokenIndex": 0,
      "tokenType": 0,
      "type": "direct"
    }
  ],
  "totalCount": 300,
  "hasMore": true,
  "nextCursor": "0x..."
}
```

**Response Fields**

| Field                      | Type    | Description                                                          |
| -------------------------- | ------- | -------------------------------------------------------------------- |
| `amount`                   | string  | Withdrawal amount in wei (string format to support large numbers)    |
| `hash`                     | string  | Unique withdrawal hash (hex string starting with 0x)                 |
| `liquidityTimestamp`       | number  | Unix timestamp when the liquidity transaction was finalized          |
| `liquidityTransactionHash` | string  | Hash of the liquidity transaction used for finalization (hex string) |
| `recipient`                | string  | Address of the withdrawal recipient (hex string)                     |
| `relayedTimestamp`         | number  | Unix timestamp when the withdrawal was relayed                       |
| `relayedTransactionHash`   | string  | Hash of the relayed transaction (hex string)                         |
| `status`                   | string  | Withdrawal status (`Indexing`, `Relayed`, `Rejected`, `Completed`)   |
| `tokenIndex`               | number  | Index of the withdrawn token in the supported token list             |
| `tokenType`                | number  | Token type identifier (0: ETH, 1–3: ERC-20 variants, etc.)           |
| `type`                     | string  | Withdrawal type (e.g., `direct`)                                     |

#### GET /v1/withdrawals/{hash}
Get detailed information for a specific withdrawal.

**Path Parameters:**
- `hash`: Withdrawal hash (hex string starting with 0x)

**Response:**
Returns a single withdrawal object with the same structure as above.

**Response Fields**

Same as the `items` array fields from GET /v1/withdrawals (single withdrawal object without pagination fields).

## Data Types

### Block Types
- `Type0` (0): Empty block (no transactions in a NonRegistration block)
- `Type1` (1): Registration block (contains Registration transactions)
- `Type2` (2): NonRegistration block (contains NonRegistration transactions)

### Block Validity
- `Valid`: Block is valid and confirmed
- `Invalid`: Block failed validation
- `Empty`: Block contains no transactions
- `Pending`: Block validation is in progress

### Transaction Status
- `Indexing`: Transaction is being indexed
- `Relayed`: Transaction has been relayed
- `Rejected`: Transaction was rejected
- `Completed`: Transaction is fully processed

### Token Types
- `0`: ETH Native Token
- `1`: ERC-20 Token Type 1
- `2`: ERC-721 Token Type 2
- `3`: ERC-1155 Token Type 3

## Rate Limiting

The API enforces rate limiting to ensure fair usage.
Rate limits may vary depending on:

- Endpoint type
- Authentication status
- API key tier

### Rate Limit Header

Rate limit information is provided in a **single `ratelimit` header** with three key-value pairs:

| Field       | Type   | Description                                                                 |
| ----------- | ------ | --------------------------------------------------------------------------- |
| `limit`     | number | Maximum number of requests allowed in the current time window.              |
| `remaining` | number | Number of requests still available in the current window.                   |
| `reset`     | number | Time (in seconds) until the current rate limit window resets.               |

## Error Codes

**Common HTTP status codes:**
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (resource doesn't exist)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

**ErrorCode values:**
* `BAD_REQUEST`: Bad Request (invalid parameters) — HTTP 400
* `NOT_FOUND`: Not Found (resource doesn't exist) — HTTP 404
* `INTERNAL_SERVER_ERROR`: Internal Server Error — HTTP 500
* `VALIDATION_ERROR`: Validation Error (schema/business rule failed) — HTTP 400
