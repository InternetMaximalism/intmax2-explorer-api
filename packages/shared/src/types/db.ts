import type { Timestamp } from "@google-cloud/firestore";

export interface BaseData {
  hash: string;
  createdAt?: Timestamp;
}

export interface BaseFilters {
  perPage?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}
