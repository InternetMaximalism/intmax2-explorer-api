import {
  Deposit,
  type DepositPaginationValidationType,
  type HashValidationType,
  NotFoundError,
} from "@intmax2-explorer-api/shared";

export const listDeposits = async (depositPaginationOptions: DepositPaginationValidationType) => {
  const deposit = Deposit.getInstance();
  return deposit.listDeposits(depositPaginationOptions);
};

export const getDeposit = async ({ hash }: HashValidationType) => {
  const depositInstance = Deposit.getInstance();
  const deposit = await depositInstance.getDepositByDepositHash(hash);
  if (!deposit) {
    throw new NotFoundError(`Deposit with hash ${hash} not found`);
  }
  return deposit;
};
