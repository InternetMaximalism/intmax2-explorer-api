import type { Transaction } from "@google-cloud/firestore";
import {
  BLOCK_RANGE_MINIMUM,
  Block,
  type BlockData,
  type BlockInput,
  type BlockPostedEvent,
  BlockType,
  BlockValidity,
  Event,
  type EventData,
  FIRESTORE_DOCUMENT_STATS,
  RollupAbi,
  Stats,
  type StatsData,
  blockPostedEvent,
  calcBlockHash,
  db,
  fetchEvents,
  getStartBlockNumber,
  logger,
  validateBlockRange,
} from "@intmax2-explorer-api/shared";
import { type Hex, type PublicClient, decodeFunctionData } from "viem";
import {
  BLOCK_BATCH_SIZE,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  ROLLUP_CONTRACT_ADDRESS,
} from "../constants";
import { calculateNonRegistrationLength } from "../lib/utils";

export const fetchAndStoreBlocks = async (
  scrollClient: PublicClient,
  scrollCurrentBlockNumber: bigint,
  blockEvent: Event,
  lastBlockProcessedEvent: EventData | null,
) => {
  const blockPostedEvents = await getBlockPostedEvent(
    scrollClient,
    scrollCurrentBlockNumber,
    lastBlockProcessedEvent,
  );

  const blockDetails: BlockInput[] = [];
  for (let i = 0; i < blockPostedEvents.length; i += BLOCK_BATCH_SIZE) {
    const batch = blockPostedEvents.slice(i, i + BLOCK_BATCH_SIZE);
    const blockDetail = await processBlockBatch(batch, scrollClient);
    blockDetails.push(...blockDetail);
  }

  const block = Block.getInstance();
  for (let i = 0; i < blockDetails.length; i += BLOCK_BATCH_SIZE) {
    const batch = blockDetails.slice(i, i + BLOCK_BATCH_SIZE);
    await block.addBlocksBatch(batch);
    logger.info(
      `Processed block batch ${Math.floor(i / BLOCK_BATCH_SIZE) + 1} of ${Math.ceil(blockDetails.length / BLOCK_BATCH_SIZE)}`,
    );
  }

  await db.runTransaction(async (transaction) => {
    if (blockDetails.length > 0) {
      await fetchAndStoreStats(transaction, blockDetails);
    }

    await blockEvent.addOrUpdateEventWithTransaction(transaction, {
      lastBlockNumber: Number(scrollCurrentBlockNumber),
    });
  });

  logger.info(`Completed processing blocks for ${blockDetails.length} blocks`);
};

const fetchAndStoreStats = async (transaction: Transaction, blockDetails: BlockData[]) => {
  const latestBlock = findLatestBlockNumber(blockDetails);
  const newTransactions = calculateTotalTransactions(blockDetails);
  const newWallets = calculateNewWallets(blockDetails);

  const stats = new Stats(FIRESTORE_DOCUMENT_STATS.summary);
  const currentStats = await stats.getLatestStats<StatsData>();

  if (!currentStats) {
    stats.addOrUpdateStatsWithTransaction(transaction, {
      latestBlockNumber: latestBlock ?? 0,
      totalTransactionCount: newTransactions,
      totalWalletCount: newWallets,
    });
    return;
  }

  stats.addOrUpdateStats({
    ...(latestBlock !== null && { latestBlockNumber: latestBlock }),
    totalTransactionCount: currentStats.totalTransactionCount + newTransactions,
    totalWalletCount: currentStats.totalWalletCount + newWallets,
  });

  logger.info(
    `Saved summary stats for latest block number ${latestBlock} and increase transaction count ${newTransactions}`,
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
    senderFlags: args[2] as `0x${string}`,
    aggregatedPublicKey: args[3] as `0x${string}`[],
    aggregatedSignature: args[4] as `0x${string}`[],
    messagePoint: args[5] as `0x${string}`[],
  };

  if (functionName === "postRegistrationBlock") {
    const senderPublicKeys = args[6] as bigint[];
    return {
      ...baseTransaction,
      senderPublicKeys,
      transactionCount: senderPublicKeys.length,
    };
  }

  const senderAccountIds = args[7] as `0x${string}`;
  return {
    ...baseTransaction,
    publicKeysHash: args[6] as `0x${string}`,
    senderAccountIds,
    transactionCount: calculateNonRegistrationLength(senderAccountIds),
  };
};

const getBlockPostedEvent = async (
  scrollClient: PublicClient,
  scrollCurrentBlockNumber: bigint,
  lastProcessedEvent: EventData | null,
) => {
  try {
    const startBlockNumber = getStartBlockNumber(
      lastProcessedEvent,
      LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
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
) => {
  const promises = blockPostedEvents.map(async (blockPostedEvent) => {
    const transaction = await scrollClient.getTransaction({
      hash: blockPostedEvent.transactionHash as `0x${string}`,
    });
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

    return {
      blockNumber: blockPostedEvent.args.blockNumber,
      hash: blockHash,
      transactionCount: formattedBlockTransaction.transactionCount,
      builderAddress: blockPostedEvent.args.blockBuilder,
      blockType:
        functionName === "postRegistrationBlock"
          ? "Registration"
          : ("NonRegistration" as BlockType),
      blockValidity: "Valid" as BlockValidity,
      timestamp: blockPostedEvent.args.timestamp,
      rollupTransactionHash: blockPostedEvent.transactionHash,
      transactionDigest: formattedBlockTransaction.txRoot,
      blockAggregatorSignature: formattedBlockTransaction.aggregatedSignature,
    };
  });

  return Promise.all(promises);
};

const findLatestBlockNumber = (blockDetails: BlockData[]) => {
  if (blockDetails.length === 0) {
    return null;
  }
  return blockDetails.reduce((acc, detail) => Math.max(acc, Number(detail.blockNumber)), 0);
};

const calculateTotalTransactions = (blockDetails: BlockData[]) => {
  if (blockDetails.length === 0) {
    return 0;
  }
  return blockDetails.reduce((acc, detail) => acc + Number(detail.transactionCount), 0);
};

const calculateNewWallets = (blockDetails: BlockData[]) => {
  if (blockDetails.length === 0) {
    return 0;
  }
  const registrationBlocks = blockDetails.filter((detail) => detail.blockType === "Registration");
  return registrationBlocks.reduce((acc, detail) => acc + detail.transactionCount, 0);
};
