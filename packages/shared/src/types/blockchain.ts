export interface BaseEvent {
  name: string;
  address: string;
  blockNumber: bigint;
  blockTimestamp: string;
  transactionHash: string;
}

export interface DepositEvent extends BaseEvent {
  args: DepositEventLog;
  blockNumber: bigint;
  transactionHash: string;
}

export interface DepositEventLog {
  depositId: bigint;
  sender: string;
  recipientSaltHash: string;
  tokenIndex: number;
  amount: bigint;
  isEligible: boolean;
  depositedAt: bigint;
}

export type GetDepositData = {
  depositHash: string;
  sender: string;
  isRejected: boolean;
};

export interface DirectWithdrawalSuccessedEvent extends BaseEvent {
  args: DirectWithdrawalSuccessedEventLog;
}

export interface WithdrawalEvent extends BaseEvent {
  args: WithdrawalEventLog;
}

export interface WithdrawalEventLog {
  withdrawalHash: string;
}

export interface DirectWithdrawalSuccessedEventLog extends WithdrawalEventLog {
  recipient: string;
}

export interface WithdrawalClaimableEvent extends BaseEvent {
  args: WithdrawalClaimableEventLog;
}

export interface WithdrawalClaimableEventLog extends WithdrawalEventLog {}

export interface ClaimedWithdrawalEvent extends BaseEvent {
  args: ClaimedWithdrawalEventLog;
}

export interface ClaimedWithdrawalEventLog extends WithdrawalEventLog {
  recipient: string;
}

export interface BlockPostedEvent extends BaseEvent {
  args: BlockPostedEventLog;
  transactionHash: string;
}

export interface BlockPostedEventLog {
  prevBlockHash: string;
  timestamp: number;
  blockBuilder: string;
  blockNumber: number;
  depositTreeRoot: string;
  signatureHash: string;
}

export interface DirectWithdrawalQueueEvent extends BaseEvent {
  args: DirectWithdrawalQueueEventLog;
}

export interface DirectWithdrawalQueueEventLog {
  withdrawalHash: string;
  recipient: string;
  withdrawal: Withdrawal;
}

export interface ClaimableWithdrawalEvent extends BaseEvent {
  args: ClaimableWithdrawalEventLog;
}

export interface ClaimableWithdrawalEventLog {
  withdrawalHash: string;
  recipient: string;
  withdrawal: Withdrawal;
}

interface Withdrawal {
  recipient: string;
  tokenIndex: number;
  amount: bigint;
  nullifier: string;
}

export type TransactionStatus = "Indexing" | "Relayed" | "Rejected" | "Completed";
export type TokenType = 0 | 1 | 2 | 3;

export type NetworkLayer = "l1" | "l2";
