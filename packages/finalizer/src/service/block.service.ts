import type { Transaction } from "@google-cloud/firestore";
import {
  BLOCK_BATCH_SIZE_LARGE,
  Block,
  BlockData,
  BlockInput,
  FIRESTORE_DOCUMENT_STATS,
  type ProcessingPendingBlockData,
  Stats,
  type StatsData,
  calculateNextAccountId,
  calculateTotalTransactions,
  config,
  db,
  fetchLatestValidityProofBlockNumber,
  fetchValidityPis,
  getBlockStatusFromValidityProof,
  getBlockValidity,
  getProvingBlockStatus,
  logger,
  sleep,
} from "@intmax2-explorer-api/shared";

export const finalizePendingBlocks = async () => {
  const block = Block.getInstance();
  const [
    { items: indexingBlocks, totalCount: indexingCount },
    { items: provingBlocks, totalCount: provingCount },
    { blockNumber: latestValidityBlockNumber },
  ] = await Promise.all([
    block.listAllBlocks({ status: "Completed" }),
    block.listAllBlocks({ status: "Proving" }),
    fetchLatestValidityProofBlockNumber(),
  ]);

  const processedIndexingBlocks: ProcessingPendingBlockData[] = [];
  for (let i = 0; i < indexingBlocks.length; i += config.VALIDITY_PROVER_API_BLOCK_BATCH_SIZE) {
    const batch = indexingBlocks.slice(i, i + config.VALIDITY_PROVER_API_BLOCK_BATCH_SIZE);
    const blockDetail = await processIndexingBlockBatch(batch, latestValidityBlockNumber);
    processedIndexingBlocks.push(...blockDetail);
    await sleep(config.VALIDITY_PROVER_API_SLEEP_TIME);
  }
  const processedProvingBlocks = processProvingBlockBatch(provingBlocks, latestValidityBlockNumber);

  const finalizedBlocks = [...processedIndexingBlocks, ...processedProvingBlocks];

  for (let i = 0; i < finalizedBlocks.length; i += BLOCK_BATCH_SIZE_LARGE) {
    const batch = finalizedBlocks.slice(i, i + BLOCK_BATCH_SIZE_LARGE);
    await block.updateBlocksBatch(batch as BlockInput[]);
    logger.info(
      `Processed block batch ${Math.floor(i / BLOCK_BATCH_SIZE_LARGE) + 1} of ${Math.ceil(finalizedBlocks.length / BLOCK_BATCH_SIZE_LARGE)}`,
    );
  }

  if (finalizedBlocks.length) {
    await db.runTransaction(async (transaction) => {
      await aggregateAndSaveStats(transaction, processedIndexingBlocks, processedProvingBlocks);
    });
  }

  logger.info(
    `finalizePendingBlocks completed successfully:
    - Total blocks processed: ${finalizedBlocks.length}
    - Indexing blocks: ${processedIndexingBlocks.length}/${indexingCount}
    - Proving blocks: ${processedProvingBlocks.length}/${provingCount}
    - Latest validity block number: ${latestValidityBlockNumber}`,
  );
};

const aggregateAndSaveStats = async (
  transaction: Transaction,
  processedIndexingBlocks: ProcessingPendingBlockData[],
  processedProvingBlocks: ProcessingPendingBlockData[],
) => {
  const newTransactions = calculateTotalTransactions(processedIndexingBlocks);
  const maxNextAccountId = calculateNextAccountId([
    ...processedIndexingBlocks,
    ...processedProvingBlocks,
  ]);

  const stats = new Stats(FIRESTORE_DOCUMENT_STATS.summary);
  const currentStats = await stats.getLatestStatsWithTransaction<StatsData>(transaction);
  const totalL2WalletCount = Math.max(maxNextAccountId, currentStats?.totalL2WalletCount ?? 0);

  if (!currentStats) {
    await stats.addOrUpdateStatsWithTransaction(transaction, {
      totalTransactionCount: newTransactions,
      totalL2WalletCount,
    });
    return;
  }

  await stats.addOrUpdateStatsWithTransaction(transaction, {
    totalTransactionCount: currentStats.totalTransactionCount + newTransactions,
    totalL2WalletCount,
  });

  logger.info(
    `Saved summary stats for increase transaction count ${newTransactions} and total L2 wallet count ${totalL2WalletCount}`,
  );
};

const processIndexingBlockBatch = async (
  blocks: BlockData[],
  latestValidityBlockNumber: number,
) => {
  const promises = blocks.map(async (block) => {
    const validityProof = await fetchValidityPis(block.blockNumber);

    const blockValidity = getBlockValidity(validityProof, block.blockType);
    const status = getBlockStatusFromValidityProof(
      validityProof,
      latestValidityBlockNumber,
      block.blockNumber,
    );

    // blocks are still being indexed
    if (status === "Indexing") {
      return null;
    }

    const nextAccountId = validityProof?.publicState.nextAccountId;

    return {
      hash: block.hash,
      status,
      blockValidity,
      nextAccountId,
      transactionCount: block.transactionCount,
      internalBlockType: block.internalBlockType,
    };
  });
  const results = await Promise.all(promises);

  return results.filter((result) => result !== null) satisfies ProcessingPendingBlockData[];
};

const processProvingBlockBatch = (blocks: BlockData[], latestValidityBlockNumber: number) => {
  const results = blocks.map((block) => {
    const blockNumber = block.blockNumber;
    const status = getProvingBlockStatus(blockNumber, latestValidityBlockNumber);

    // blocks are still being proven
    if (status === "Proving") {
      return null;
    }

    return {
      hash: block.hash,
      status,
      blockValidity: block.blockValidity,
      nextAccountId: block.nextAccountId,
      transactionCount: block.transactionCount,
      internalBlockType: block.internalBlockType,
    };
  });

  return results.filter((result) => result !== null) satisfies ProcessingPendingBlockData[];
};
