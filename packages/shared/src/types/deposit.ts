import type { Timestamp } from "@google-cloud/firestore";
import { TransactionStatus } from "./blockchain";

export type DepositInput = {
  depositId: number;
  sender: string;
  amount: string;
  blockNumber: number;
  hash: string;
  timestamp: number;
  tokenIndex: number;
  tokenType: number;
  status: TransactionStatus;
};

export type DepositData = {
  depositId: number;
  sender: string;
  amount: string;
  hash: string;
  timestamp: number;
  blockNumber: number;
  tokenIndex: number;
  status: TransactionStatus;
  createdAt: Timestamp;
};

export type DepositFilters = {
  perPage?: number;
  cursor?: string;
  tokenType?: number;
  status?: TransactionStatus;
};
