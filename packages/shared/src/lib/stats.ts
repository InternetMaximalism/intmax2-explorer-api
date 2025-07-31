import type {
  ProcessingPendingBlockData,
  ProcessingPendingBlockDataWithBlockNumber,
} from "../types";

export const calculateNextAccountId = (blockDetails: ProcessingPendingBlockData[]) => {
  const registrationBlocks = blockDetails.filter(
    (detail) => detail.blockValidity === "Valid" && detail.internalBlockType === "Registration",
  );

  if (registrationBlocks.length === 0) {
    return 0;
  }

  const maxAccountId = registrationBlocks.reduce(
    (maxId, detail) => Math.max(maxId, Number(detail.nextAccountId || 0)),
    0,
  );

  return maxAccountId;
};

export const calculateTotalTransactions = (blockDetails: ProcessingPendingBlockData[]) => {
  const validBlocks = blockDetails
    .filter((blockDetail) => blockDetail.status !== "Indexing")
    .filter((blockDetail) => blockDetail.blockValidity === "Valid");

  const totalTransactionCount = validBlocks.reduce((total, blockDetail) => {
    const transactionCount = Number(blockDetail.transactionCount || 0);
    return total + transactionCount;
  }, 0);

  return totalTransactionCount;
};

export const getLatestBlockNumber = (blockDetails: ProcessingPendingBlockDataWithBlockNumber[]) => {
  if (blockDetails.length === 0) {
    return null;
  }

  const latestBlockNumber = blockDetails.reduce(
    (maxBlock, detail) => Math.max(maxBlock, Number(detail.blockNumber)),
    0,
  );

  return latestBlockNumber;
};
