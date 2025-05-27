import type {
  Event,
  EventData,
  TransactionStatus,
  WithdrawalType,
} from "@intmax2-explorer-api/shared";
import type { PublicClient } from "viem";

export type IndexedWithdrawal = {
  hash: string;
  status: TransactionStatus;
  type: WithdrawalType;
  liquidityTransactionHash: string;
};

// withdrawal
export type FinalizeIndexedWithdrawalsParams = {
  ethereumClient: PublicClient;
  currentBlockNumber: bigint;
  scrollClient: PublicClient;
  scrollCurrentBlockNumber: bigint;
  lastWithdrawalQueueProcessedEvent: EventData | null;
  withdrawalQueueEvent: Event;
};
