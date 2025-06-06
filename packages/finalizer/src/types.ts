import type { TransactionStatus, WithdrawalType } from "@intmax2-explorer-api/shared";

export type RelayedWithdrawal = {
  hash: string;
  status: TransactionStatus;
  type: WithdrawalType;
  liquidityTransactionHash: string;
};
