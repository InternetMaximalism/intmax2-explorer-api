import { config } from "./config";

// pagination
export const DEFAULT_PAGE_SIZE = 10;

// block event
export const BLOCK_RANGE_MOST_RECENT = 500n;
export const BLOCK_RANGE_MINIMUM = 1000n;
export const BLOCK_RANGE_NORMAL = 10000n;
export const BLOCK_RANGE_MAX = 30000n;

// db
export const FIRESTORE_COLLECTIONS = {
  EVENT: "events",
  STATS: "stats",
  BLOCK: "blocks",
  DEPOSIT: "deposits",
  WITHDRAWAL: "withdrawals",
} as const;

export const FIRESTORE_DOCUMENT_STATS = {
  summary: "summary",
} as const;

export const FIRESTORE_DOCUMENT_EVENTS = {
  BLOCK: "block",
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
  WITHDRAWAL_QUEUE: "withdrawalQueue",
} as const;

export const FIRESTORE_MAX_BATCH_SIZE = 500;
export const FIRESTORE_IN_MAX_BATCH_SIZE = 30;

// request
export const API_TIMEOUT = 10 * 1000;
export const VALIDITY_PROVER_API_SLEEP_TIME = 1000; // 1 second

// rollup
export const ROLLUP_CONTRACT_ADDRESS = config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`;
export const ROLLUP_CONTRACT_DEPLOYED_BLOCK = BigInt(
  config.ROLLUP_CONTRACT_DEPLOYED_BLOCK,
) as bigint;

// liquidity
export const LIQUIDITY_CONTRACT_ADDRESS = config.LIQUIDITY_CONTRACT_ADDRESS as `0x${string}`;
export const LIQUIDITY_CONTRACT_DEPLOYED_BLOCK = BigInt(
  config.LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
) as bigint;

// withdrawal
export const WITHDRAWAL_CONTRACT_ADDRESS = config.WITHDRAWAL_CONTRACT_ADDRESS as `0x${string}`;
export const WITHDRAWAL_CONTRACT_DEPLOYED_BLOCK = BigInt(
  config.WITHDRAWAL_CONTRACT_DEPLOYED_BLOCK,
) as bigint;

// batch size
export const BLOCK_BATCH_SIZE = 30;
export const BLOCK_BATCH_SIZE_LARGE = 100;
export const DEPOSIT_BATCH_SIZE = 100;
export const WITHDRAWAL_BATCH_SIZE = 100;

// multicall
export const TOKEN_MULTICALL_SIZE = 100;
