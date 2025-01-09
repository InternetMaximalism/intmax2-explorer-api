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
