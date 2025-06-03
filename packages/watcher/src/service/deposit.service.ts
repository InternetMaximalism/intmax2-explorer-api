import type { Transaction } from "@google-cloud/firestore";
import {
  BLOCK_RANGE_MINIMUM,
  DEPOSIT_BATCH_SIZE,
  Deposit,
  type DepositEvent,
  DepositInput,
  Event,
  type EventData,
  FIRESTORE_DOCUMENT_STATS,
  LIQUIDITY_CONTRACT_ADDRESS,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  LiquidityAbi,
  Stats,
  type StatsData,
  type TokenInfo,
  TransactionStatus,
  db,
  depositedEvent,
  fetchEvents,
  fetchTokenData,
  getStartBlockNumber,
  logger,
  validateBlockRange,
} from "@intmax2-explorer-api/shared";
import type { Abi, PublicClient } from "viem";
import type { GetDepositData } from "../types";

export const fetchAndStoreDeposits = async (
  ethereumClient: PublicClient,
  currentBlockNumber: bigint,
  depositEvent: Event,
  lastDepositedProcessedEvent: EventData | null,
) => {
  const depositEvents = await getDepositedEvent(
    ethereumClient,
    currentBlockNumber,
    lastDepositedProcessedEvent,
  );
  const depositDetails = await getDepositDetails(ethereumClient, currentBlockNumber, depositEvents);
  const deposit = Deposit.getInstance();

  for (let i = 0; i < depositDetails.length; i += DEPOSIT_BATCH_SIZE) {
    const batch = depositDetails.slice(i, i + DEPOSIT_BATCH_SIZE);
    await deposit.addDepositsBatch(batch);
    logger.info(
      `Processed deposit batch ${Math.floor(i / DEPOSIT_BATCH_SIZE) + 1} of ${Math.ceil(depositDetails.length / DEPOSIT_BATCH_SIZE)}`,
    );
  }

  await db.runTransaction(async (transaction) => {
    if (depositDetails.length > 0) {
      await aggregateAndSaveStats(transaction, depositDetails);
    }

    await depositEvent.addOrUpdateEventWithTransaction(transaction, {
      lastBlockNumber: Number(currentBlockNumber),
    });
  });

  logger.info(`Completed processing deposits for ${depositDetails.length} deposits`);
};

const aggregateAndSaveStats = async (transaction: Transaction, depositDetails: DepositInput[]) => {
  const stats = new Stats(FIRESTORE_DOCUMENT_STATS.summary);
  const currentStats = await stats.getLatestStatsWithTransaction<StatsData>(transaction);
  const newL1WalletCount = depositDetails.length;

  if (!currentStats) {
    await stats.addOrUpdateStatsWithTransaction(transaction, {
      totalL1WalletCount: newL1WalletCount,
    });
    return;
  }

  const newTotalL1WalletCount = currentStats.totalL1WalletCount + newL1WalletCount;

  await stats.addOrUpdateStatsWithTransaction(transaction, {
    totalL1WalletCount: newTotalL1WalletCount,
  });

  logger.info(
    `Updated summary stats - Previous L1 wallet count: ${currentStats.totalL1WalletCount}, ` +
      `Added: ${newL1WalletCount}, New total: ${newTotalL1WalletCount}`,
  );
};

export const getDepositedEvent = async (
  ethereumClient: PublicClient,
  currentBlockNumber: bigint,
  lastProcessedEvent: EventData | null,
) => {
  try {
    const startBlockNumber = getStartBlockNumber(
      lastProcessedEvent,
      LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
    );
    validateBlockRange("depositedEvent", startBlockNumber, currentBlockNumber);

    // NOTE: Details: Log response size exceeded. You can make eth_getLogs requests with up to a 2K block range
    const depositEvents = await fetchEvents<DepositEvent>(ethereumClient, {
      startBlockNumber,
      endBlockNumber: currentBlockNumber,
      blockRange: BLOCK_RANGE_MINIMUM,
      contractAddress: LIQUIDITY_CONTRACT_ADDRESS,
      eventInterface: depositedEvent,
    });

    return depositEvents;
  } catch (error) {
    logger.error(
      `Error fetching v1 deposited events: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
};

export const getDepositDetails = async (
  ethereumClient: PublicClient,
  currentBlockNumber: bigint,
  depositEvents: DepositEvent[],
) => {
  const tokenIndexes = depositEvents.map(({ args: { tokenIndex } }) => tokenIndex);
  const uniqueTokenIndexes = Array.from(new Set(tokenIndexes));
  const tokenDetails = await fetchTokenData(ethereumClient, uniqueTokenIndexes);
  const tokenDetailsMap = new Map(tokenDetails.map((token) => [token.tokenIndex, token]));

  const batches: DepositEvent[][] = [];
  for (let i = 0; i < depositEvents.length; i += DEPOSIT_BATCH_SIZE) {
    batches.push(depositEvents.slice(i, i + DEPOSIT_BATCH_SIZE));
  }

  const depositDetails = [];
  for (const batch of batches) {
    const batchDepositData = await processDepositBatch(
      ethereumClient,
      batch,
      currentBlockNumber,
      tokenDetailsMap,
    );
    depositDetails.push(...batchDepositData);
  }

  return depositDetails;
};

const processDepositBatch = async (
  ethereumClient: PublicClient,
  batch: DepositEvent[],
  currentBlockNumber: bigint,
  tokenDetailsMap: Map<number, TokenInfo>,
) => {
  const depositIds = batch.map(({ args: { depositId } }) => depositId);

  const results = (await ethereumClient.readContract({
    address: LIQUIDITY_CONTRACT_ADDRESS,
    abi: LiquidityAbi as Abi,
    functionName: "getDepositDataBatch",
    args: [depositIds],
    blockNumber: currentBlockNumber,
  })) as GetDepositData[];

  const processPromises = results.map(async (depositData, index) => {
    const depositLog = batch[index];
    const tokenDetail = tokenDetailsMap.get(depositLog.args.tokenIndex);
    if (!tokenDetail) {
      throw new Error(
        `Token detail is not found for token index: ${Number(depositLog.args.tokenIndex)}`,
      );
    }

    return {
      depositId: Number(depositLog.args.depositId),
      sender: depositLog.args.sender.toLowerCase(),
      tokenIndex: Number(depositLog.args.tokenIndex),
      tokenType: tokenDetail.tokenType,
      amount: depositLog.args.amount.toString(),
      blockNumber: Number(depositLog.blockNumber),
      hash: depositLog.transactionHash,
      timestamp: Number(depositLog.args.depositedAt),
      status: depositData.isRejected ? "Rejected" : ("Completed" as TransactionStatus),
    };
  });

  const processedData = await Promise.all(processPromises);
  return processedData;
};
