import type { Timestamp } from "@google-cloud/firestore";
import { TransactionStatus } from "./blockchain";

export type WithdrawalType = "direct" | "claimable";

export type WithdrawalInput = {
  recipient: string;
  tokenIndex: number;
  tokenType: number;
  amount: string;
  hash: string;
  liquidityTransactionHash: string;
  liquidityTimestamp: number;
  relayedTransactionHash: string;
  relayedTimestamp: number;
  type: WithdrawalType;
  status: TransactionStatus;
};

export type WithdrawalData = {
  recipient: string;
  tokenIndex: number;
  tokenType: number;
  amount: string;
  hash: string;
  liquidityTransactionHash: string;
  liquidityTimestamp: number;
  relayedTransactionHash: string;
  relayedTimestamp: number;
  status: TransactionStatus;
  type: WithdrawalType;
  createdAt: Timestamp;
};

export type WithdrawalFilters = {
  perPage?: number;
  cursor?: string;
  tokenType?: number;
  status?: TransactionStatus;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
};
