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
  depositedAt: bigint;
}

export type GetDepositData = {
  depositHash: string;
  sender: string;
  isRejected: boolean;
};

export interface DepositsAnalyedAndProcessedEvent extends BaseEvent {
  args: DepositsAnalyedAndProcessedEventLog;
}

export interface DepositsAnalyedAndProcessedEventLog {
  upToDepositId: bigint;
  rejectedIndices: bigint[];
  depositHashed: string[];
}

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

export type TransactionStatus = "Pending" | "Rejected" | "Completed" | "Finalized";
export type TokenType = 0 | 1 | 2 | 3;

// block
export type BlockType = "Registration" | "NonRegistration";
export type BlockValidity = "Valid" | "Invalid";
