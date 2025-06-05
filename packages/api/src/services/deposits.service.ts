import {
  Deposit,
  type DepositPaginationValidationType,
  type HashValidationType,
  NotFoundError,
} from "@intmax2-explorer-api/shared";

export const listDeposits = async (depositPaginationOptions: DepositPaginationValidationType) => {
  const depositInstance = Deposit.getInstance();
  return depositInstance.listDeposits(depositPaginationOptions);
};

export const getDeposit = async ({ hash }: HashValidationType) => {
  const depositInstance = Deposit.getInstance();
  const deposit = await depositInstance.getDepositByDepositHash(hash);
  if (!deposit) {
    throw new NotFoundError(`Deposit with hash ${hash} not found`);
  }
  return deposit;
};
