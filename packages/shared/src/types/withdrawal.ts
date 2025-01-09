import type { Timestamp } from "@google-cloud/firestore";
import { TransactionStatus } from "./blockchain";

export type WithdrawalInput = {
  recipient: string;
  tokenIndex: number;
  tokenType: number;
  amount: string;
  blockNumber: number;
  hash: string;
  timestamp: number;
  liquidityTransactionHash: string;
  status: TransactionStatus;
};

export type WithdrawalData = {
  recipient: string;
  tokenIndex: number;
  tokenType: number;
  amount: string;
  blockNumber: number;
  hash: string;
  timestamp: number;
  status: TransactionStatus;
  createdAt: Timestamp;
};

export type WithdrawalFilters = {
  perPage?: number;
  cursor?: string;
  tokenType?: number;
  status?: TransactionStatus;
};
