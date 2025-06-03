import type { Timestamp } from "@google-cloud/firestore";

export type BlockInput = {
  blockNumber: number;
  hash: string;
  status: BlockStatus;
  blockValidity: BlockValidity;
  transactionCount: number;
  builderAddress: string;
  internalBlockType: InternalBlockType;
  blockType: BlockType;
  timestamp: number;
  rollupTransactionHash: string;
  transactionDigest: string;
  blockAggregatorSignature: string[];
  nextAccountId: number | null;
};

export type BlockData = {
  blockNumber: number;
  hash: string;
  status: BlockStatus;
  transactionCount: number;
  blockValidity: BlockValidity;
  builderAddress: string;
  internalBlockType: InternalBlockType;
  blockType: BlockType;
  timestamp: number;
  rollupTransactionHash: string;
  transactionDigest: string;
  blockAggregatorSignature: string[];
  nextAccountId: number | null;
  createdAt?: Timestamp;
};

export type ProcessingBlockData = Omit<BlockData, "createdAt"> & {
  nextAccountId: number | null;
};

export type BlockFilters = {
  perPage?: number;
  cursor?: string;
  blockType?: BlockDisplayType;
  blockValidity?: BlockValidity;
  status?: BlockStatus;
  orderDirection?: "asc" | "desc";
};

/**
 * Block type identifier
 * - 0: Empty block (no transactions in a NonRegistration block)
 * - 1: Registration block (contains Registration transactions)
 * - 2: NonRegistration block (contains NonRegistration transactions)
 */
export type BlockType = 0 | 1 | 2;
export type InternalBlockType = "Registration" | "NonRegistration";
export type BlockValidity = "Valid" | "Invalid" | "Empty" | "Pending";
export type BlockStatus = "Indexing" | "Proving" | "Completed";

export const BlockDisplayType = {
  0: "Type0",
  1: "Type1",
  2: "Type2",
} as const;
export const DisplayTypeToBlock = {
  Type0: 0,
  Type1: 1,
  Type2: 2,
} as const;

export type BlockDisplayType = (typeof BlockDisplayType)[keyof typeof BlockDisplayType];

export const INTERNAL_TO_TYPE_MAP = {
  Registration: 1,
  NonRegistration: 2,
} as const;
