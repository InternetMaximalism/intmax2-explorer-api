import type { Timestamp } from "@google-cloud/firestore";

export interface BaseData {
  hash: string;
  blockNumber: number;
  timestamp: number;
  createdAt?: Timestamp;
}

export interface BaseFilters {
  perPage?: number;
  cursor?: string;
}
