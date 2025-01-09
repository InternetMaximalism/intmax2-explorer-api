import type { Timestamp } from "@google-cloud/firestore";
import { BlockType, BlockValidity } from "./blockchain";

export type BlockInput = {
  blockNumber: number;
  hash: string;
  blockValidity: BlockValidity;
  transactionCount: number;
  builderAddress: string;
  blockType: BlockType;
  timestamp: number;
  rollupTransactionHash: string;
  transactionDigest: string;
  blockAggregatorSignature: string[];
};

export type BlockData = {
  blockNumber: number;
  hash: string;
  transactionCount: number;
  blockValidity: BlockValidity;
  builderAddress: string;
  blockType: BlockType;
  timestamp: number;
  rollupTransactionHash: string;
  transactionDigest: string;
  blockAggregatorSignature: string[];
  createdAt?: Timestamp;
};

export type BlockFilters = {
  perPage?: number;
  cursor?: string;
  blockType?: BlockType;
  blockValidity?: BlockValidity;
};
