import type {
  Event,
  EventData,
  TransactionStatus,
  WithdrawalType,
} from "@intmax2-explorer-api/shared";
import type { PublicClient } from "viem";

export type RelayedWithdrawal = {
  hash: string;
  status: TransactionStatus;
  type: WithdrawalType;
  liquidityTransactionHash: string;
};

export type FinalizeRelayedWithdrawalsParams = {
  ethereumClient: PublicClient;
  currentBlockNumber: bigint;
  withdrawalEvent: Event;
  lastWithdrawalProcessedEvent: EventData | null;
};
