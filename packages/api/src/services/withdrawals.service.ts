import {
  type HashValidationType,
  NotFoundError,
  Withdrawal,
  type WithdrawalPaginationValidationType,
} from "@intmax2-explorer-api/shared";

export const listWithdrawals = async (
  withdrawalPaginationOptions: WithdrawalPaginationValidationType,
) => {
  const withdrawal = Withdrawal.getInstance();
  return withdrawal.listWithdrawals(withdrawalPaginationOptions);
};

export const getWithdrawal = async ({ hash }: HashValidationType) => {
  const withdrawalInstance = Withdrawal.getInstance();
  const withdrawal = await withdrawalInstance.getWithdrawalByWithdrawalHash(hash);
  if (!withdrawal) {
    throw new NotFoundError(`Withdrawal with hash ${hash} not found`);
  }
  return withdrawal;
};
