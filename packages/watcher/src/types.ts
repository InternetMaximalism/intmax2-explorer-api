import type { Event, EventData } from "@intmax2-explorer-api/shared";
import type { PublicClient } from "viem";

// withdrawal
export type FetchAndStoreWithdrawalsParams = {
  ethereumClient: PublicClient;
  currentBlockNumber: bigint;
  scrollClient: PublicClient;
  scrollCurrentBlockNumber: bigint;
  lastWithdrawalProcessedEvent: EventData | null;
  lastWithdrawalQueueProcessedEvent: EventData | null;
  withdrawalEvent: Event;
  withdrawalQueueEvent: Event;
};

export const WithdrawalEvents = {
  DIRECT_WITHDRAWAL_SUCCEEDED: "DirectWithdrawalSuccessed",
  WITHDRAWAL_CLAIMABLE: "WithdrawalClaimable",
  CLAIMED_WITHDRAWAL: "ClaimedWithdrawal",
} as const;

export type WithdrawalEventType = (typeof WithdrawalEvents)[keyof typeof WithdrawalEvents];

export const WITHDRAWAL_EVENT_NAMES = Object.values(WithdrawalEvents);

// deposit
export interface GetDepositData {
  depositHash: string;
  sender: string;
  isRejected: boolean;
}
