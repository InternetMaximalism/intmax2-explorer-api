import type {
  Event,
  EventData,
  TransactionStatus,
  WithdrawalType,
} from "@intmax2-explorer-api/shared";
import type { PublicClient } from "viem";

// token
export enum TokenType {
  NATIVE,
  ERC20,
  ERC721,
  ERC1155,
}

export interface TokenInfo {
  tokenType: TokenType;
  tokenIndex: number;
  contractAddress: string;
}

export type IndexedWithdrawal = {
  hash: string;
  status: TransactionStatus;
  type: WithdrawalType;
  liquidityTransactionHash: string;
};

// withdrawal
export type FetchAndStoreWithdrawalsParams = {
  ethereumClient: PublicClient;
  currentBlockNumber: bigint;
  scrollClient: PublicClient;
  scrollCurrentBlockNumber: bigint;
  lastWithdrawalQueueProcessedEvent: EventData | null;
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
