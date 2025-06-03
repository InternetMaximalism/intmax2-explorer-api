import type { Transaction } from "@google-cloud/firestore";
import {
  BLOCK_BATCH_SIZE,
  BLOCK_BATCH_SIZE_LARGE,
  BLOCK_RANGE_MINIMUM,
  Block,
  type BlockPostedEvent,
  Event,
  type EventData,
  FIRESTORE_DOCUMENT_STATS,
  type ProcessingBlockData,
  ROLLUP_CONTRACT_ADDRESS,
  ROLLUP_CONTRACT_DEPLOYED_BLOCK,
  RollupAbi,
  Stats,
  type StatsData,
  VALIDITY_PROVER_API_SLEEP_TIME,
  blockPostedEvent,
  calcBlockHash,
  calculateNextAccountId,
  calculateTotalTransactions,
  db,
  fetchEvents,
  fetchLatestValidityProofBlockNumber,
  fetchValidityPis,
  getBlockStatusFromValidityProof,
  getBlockType,
  getBlockValidity,
  getInternalBlockType,
  getLatestBlockNumber,
  getStartBlockNumber,
  logger,
  sleep,
  validateBlockRange,
} from "@intmax2-explorer-api/shared";
import { type Hex, type PublicClient, decodeFunctionData } from "viem";
import { calculateNonRegistrationLength } from "../lib/utils";

export const fetchAndStoreBlocks = async (
  scrollClient: PublicClient,
  scrollCurrentBlockNumber: bigint,
  blockEvent: Event,
  lastBlockProcessedEvent: EventData | null,
) => {
  const [blockPostedEvents, { blockNumber: latestValidityBlockNumber }] = await Promise.all([
    fetchBlockPostedEvent(scrollClient, scrollCurrentBlockNumber, lastBlockProcessedEvent),
    fetchLatestValidityProofBlockNumber(),
  ]);

  const blockDetails: ProcessingBlockData[] = [];
  for (let i = 0; i < blockPostedEvents.length; i += BLOCK_BATCH_SIZE) {
    const batch = blockPostedEvents.slice(i, i + BLOCK_BATCH_SIZE);
    const blockDetail = await processBlockBatch(batch, scrollClient, latestValidityBlockNumber);
    blockDetails.push(...blockDetail);
    await sleep(VALIDITY_PROVER_API_SLEEP_TIME);
  }

  const block = Block.getInstance();
  for (let i = 0; i < blockDetails.length; i += BLOCK_BATCH_SIZE_LARGE) {
    const batch = blockDetails.slice(i, i + BLOCK_BATCH_SIZE_LARGE);
    await block.addBlocksBatch(batch);
    logger.info(
      `Processed block batch ${Math.floor(i / BLOCK_BATCH_SIZE_LARGE) + 1} of ${Math.ceil(blockDetails.length / BLOCK_BATCH_SIZE_LARGE)}`,
    );
  }

  await db.runTransaction(async (transaction) => {
    if (blockDetails.length > 0) {
      await aggregateAndSaveStats(transaction, blockDetails);
    }

    await blockEvent.addOrUpdateEventWithTransaction(transaction, {
      lastBlockNumber: Number(scrollCurrentBlockNumber),
    });
  });

  logger.info(`Completed processing blocks for ${blockDetails.length} blocks`);
};

const aggregateAndSaveStats = async (
  transaction: Transaction,
  blockDetails: ProcessingBlockData[],
) => {
  const latestBlock = getLatestBlockNumber(blockDetails);
  const newTransactions = calculateTotalTransactions(blockDetails);
  const maxNextAccountId = calculateNextAccountId(blockDetails);

  const stats = new Stats(FIRESTORE_DOCUMENT_STATS.summary);
  const currentStats = await stats.getLatestStatsWithTransaction<StatsData>(transaction);
  const totalL2WalletCount = Math.max(maxNextAccountId, currentStats?.totalL2WalletCount ?? 0);

  if (!currentStats) {
    await stats.addOrUpdateStatsWithTransaction(transaction, {
      latestBlockNumber: latestBlock ?? 0,
      totalTransactionCount: newTransactions,
      totalL2WalletCount,
    });
    return;
  }

  await stats.addOrUpdateStatsWithTransaction(transaction, {
    ...(latestBlock !== null && { latestBlockNumber: latestBlock }),
    totalTransactionCount: currentStats.totalTransactionCount + newTransactions,
    totalL2WalletCount,
  });

  logger.info(
    `Saved summary stats for latest block number ${latestBlock} and increase transaction count ${newTransactions} and total L2 wallet count ${totalL2WalletCount}`,
  );
};

const formatBlockTransaction = (
  functionName: "postRegistrationBlock" | "postNonRegistrationBlock",
  args: unknown[],
) => {
  const baseTransaction = {
    functionName,
    txRoot: args[0] as `0x${string}`,
    expiry: args[1] as bigint,
    senderFlags: args[3] as `0x${string}`,
    aggregatedPublicKey: args[4] as `0x${string}`[],
    aggregatedSignature: args[5] as `0x${string}`[],
    messagePoint: args[6] as `0x${string}`[],
  };

  if (functionName === "postRegistrationBlock") {
    const senderPublicKeys = args[7] as bigint[];
    return {
      ...baseTransaction,
      senderPublicKeys,
      transactionCount: senderPublicKeys.length,
    };
  }

  const senderAccountIds = args[8] as `0x${string}`;
  return {
    ...baseTransaction,
    publicKeysHash: args[7] as `0x${string}`,
    senderAccountIds,
    transactionCount: calculateNonRegistrationLength(senderAccountIds),
  };
};

const fetchBlockPostedEvent = async (
  scrollClient: PublicClient,
  scrollCurrentBlockNumber: bigint,
  lastProcessedEvent: EventData | null,
) => {
  try {
    const startBlockNumber = getStartBlockNumber(
      lastProcessedEvent,
      ROLLUP_CONTRACT_DEPLOYED_BLOCK,
    );
    validateBlockRange("blockPostedEvent", startBlockNumber, scrollCurrentBlockNumber);

    const blockPostedEvents = await fetchEvents<BlockPostedEvent>(scrollClient, {
      startBlockNumber,
      endBlockNumber: scrollCurrentBlockNumber,
      blockRange: BLOCK_RANGE_MINIMUM,
      contractAddress: ROLLUP_CONTRACT_ADDRESS,
      eventInterface: blockPostedEvent,
    });

    return blockPostedEvents;
  } catch (error) {
    logger.error(
      `Error fetching blockPosted events: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
};

const processBlockBatch = async (
  blockPostedEvents: BlockPostedEvent[],
  scrollClient: PublicClient,
  latestValidityBlockNumber: number,
) => {
  const promises = blockPostedEvents.map(async (blockPostedEvent) => {
    const results = await Promise.allSettled([
      scrollClient.getTransaction({
        hash: blockPostedEvent.transactionHash as `0x${string}`,
      }),
      fetchValidityPis(blockPostedEvent.args.blockNumber),
    ]);
    const transaction = results[0].status === "fulfilled" ? results[0].value : null;
    const validityProof = results[1].status === "fulfilled" ? results[1].value : null;

    if (!transaction) {
      throw new Error(`Failed to fetch transaction for block ${blockPostedEvent.args.blockNumber}`);
    }

    const { functionName, args } = decodeFunctionData({
      abi: RollupAbi,
      data: transaction.input,
    });

    const formattedBlockTransaction = formatBlockTransaction(
      functionName as "postRegistrationBlock" | "postNonRegistrationBlock",
      args as unknown[],
    );

    const blockHash = calcBlockHash(
      blockPostedEvent.args.prevBlockHash as Hex,
      blockPostedEvent.args.depositTreeRoot as Hex,
      blockPostedEvent.args.signatureHash as Hex,
      blockPostedEvent.args.blockNumber,
    );

    const blockNumber = blockPostedEvent.args.blockNumber;
    const internalBlockType = getInternalBlockType(functionName);
    const transactionCount = formattedBlockTransaction.transactionCount;
    const blockType = getBlockType(transactionCount, internalBlockType);
    const blockValidity = getBlockValidity(validityProof, blockType);
    const nextAccountId = validityProof?.publicState.nextAccountId || null;
    const status = getBlockStatusFromValidityProof(
      validityProof,
      latestValidityBlockNumber,
      blockNumber,
    );

    return {
      blockNumber: blockPostedEvent.args.blockNumber,
      hash: blockHash,
      transactionCount: formattedBlockTransaction.transactionCount,
      builderAddress: blockPostedEvent.args.blockBuilder,
      status,
      internalBlockType,
      blockType,
      blockValidity,
      timestamp: blockPostedEvent.args.timestamp,
      rollupTransactionHash: blockPostedEvent.transactionHash,
      transactionDigest: formattedBlockTransaction.txRoot,
      blockAggregatorSignature: formattedBlockTransaction.aggregatedSignature,
      nextAccountId,
    };
  });

  return Promise.all(promises);
};
