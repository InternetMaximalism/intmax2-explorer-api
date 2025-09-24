import {
  BLOCK_RANGE_MOST_RECENT,
  type ClaimableWithdrawalEvent,
  claimableWithdrawalQueuedEvent,
  type DirectWithdrawalQueueEvent,
  directWithdrawalQueuedEvent,
  fetchEvents,
  fetchTokenData,
  getStartBlockNumber,
  logger,
  type TokenInfo,
  type TransactionStatus,
  validateBlockRange,
  WITHDRAWAL_BATCH_SIZE,
  WITHDRAWAL_CONTRACT_ADDRESS,
  WITHDRAWAL_CONTRACT_DEPLOYED_BLOCK,
  Withdrawal,
  type WithdrawalInput,
  type WithdrawalType,
} from "@intmax2-explorer-api/shared";
import { type PublicClient, parseAbiItem } from "viem";
import type { FetchAndStoreWithdrawalsParams } from "../types";

export const fetchAndStoreWithdrawals = async ({
  l1Client,
  l2Client,
  scrollCurrentBlockNumber,
  lastWithdrawalQueueProcessedEvent,
  withdrawalQueueEvent,
}: FetchAndStoreWithdrawalsParams) => {
  const startBlockNumber = getStartBlockNumber(
    lastWithdrawalQueueProcessedEvent,
    WITHDRAWAL_CONTRACT_DEPLOYED_BLOCK,
  );
  const isValid = validateBlockRange(
    "fetchAndStoreWithdrawals",
    startBlockNumber,
    scrollCurrentBlockNumber,
  );
  if (!isValid) {
    logger.info("Skipping fetchAndStoreWithdrawals due to invalid block range.");
    return;
  }

  const [directWithdrawalQueuedEvents, claimableWithdrawalEvents] = await Promise.all([
    fetchWithdrawalQueueEvents(
      l2Client,
      startBlockNumber,
      scrollCurrentBlockNumber,
      directWithdrawalQueuedEvent,
    ),
    fetchWithdrawalQueueEvents(
      l2Client,
      startBlockNumber,
      scrollCurrentBlockNumber,
      claimableWithdrawalQueuedEvent,
    ),
  ]);

  const allEvents = [...directWithdrawalQueuedEvents, ...claimableWithdrawalEvents];
  const tokenDetailsMap = await fetchTokenDetailsMap(l1Client, allEvents);

  const withdrawalDetails = await Promise.all([
    processWithdrawalEvents(l2Client, directWithdrawalQueuedEvents, tokenDetailsMap, "direct"),
    processWithdrawalEvents(l2Client, claimableWithdrawalEvents, tokenDetailsMap, "claimable"),
  ]).then((processed) => processed.flat());

  const withdrawal = Withdrawal.getInstance();

  for (let i = 0; i < withdrawalDetails.length; i += WITHDRAWAL_BATCH_SIZE) {
    const batch = withdrawalDetails.slice(i, i + WITHDRAWAL_BATCH_SIZE);
    await withdrawal.addWithdrawalsBatch(batch);
    logger.info(
      `Processed withdrawal batch ${Math.floor(i / WITHDRAWAL_BATCH_SIZE) + 1} of ${Math.ceil(withdrawalDetails.length / WITHDRAWAL_BATCH_SIZE)}`,
    );
  }

  await withdrawalQueueEvent.addOrUpdateEvent({
    lastBlockNumber: Number(scrollCurrentBlockNumber),
  });

  logger.info(`Completed relayed withdrawals: ${withdrawalDetails.length} added total withdrawals`);
};

const fetchWithdrawalQueueEvents = async (
  l2Client: PublicClient,
  startBlockNumber: bigint,
  scrollCurrentBlockNumber: bigint,
  eventInterface: ReturnType<typeof parseAbiItem>,
) => {
  const events = await fetchEvents<DirectWithdrawalQueueEvent>(l2Client, {
    startBlockNumber,
    endBlockNumber: scrollCurrentBlockNumber,
    blockRange: BLOCK_RANGE_MOST_RECENT,
    contractAddress: WITHDRAWAL_CONTRACT_ADDRESS,
    eventInterface: eventInterface,
  });

  return events;
};

const processWithdrawalEvents = async (
  l2Client: PublicClient,
  events: ClaimableWithdrawalEvent[] | DirectWithdrawalQueueEvent[],
  tokenDetailsMap: Map<number, TokenInfo>,
  type: WithdrawalType,
) => {
  if (events.length === 0) {
    return [];
  }

  const blockNumbers = [...new Set(events.map((event) => event.blockNumber))];
  const blocks = await fetchBlocksInBatches(l2Client, blockNumbers);
  const blockMap = new Map(blockNumbers.map((blockNumber, index) => [blockNumber, blocks[index]]));

  return events.map((event) => {
    const block = blockMap.get(event.blockNumber);
    if (!block) {
      throw new Error(`Block not found for block number: ${event.blockNumber}`);
    }

    const tokenDetail = tokenDetailsMap.get(event.args.withdrawal.tokenIndex);
    if (!tokenDetail) {
      throw new Error(
        `Token detail is not found for token index: ${event.args.withdrawal.tokenIndex}`,
      );
    }

    return {
      hash: event.args.withdrawalHash,
      recipient: event.args.recipient,
      tokenIndex: event.args.withdrawal.tokenIndex,
      tokenType: Number(tokenDetail.tokenType),
      amount: String(event.args.withdrawal.amount),
      relayedTimestamp: Number(block.timestamp),
      relayedTransactionHash: event.transactionHash,
      status: "Relayed" as TransactionStatus,
      type,
    };
  }) as WithdrawalInput[];
};

const fetchTokenDetailsMap = async (
  l1Client: PublicClient,
  events: ClaimableWithdrawalEvent[] | DirectWithdrawalQueueEvent[],
) => {
  const tokenIndexes = events.map(({ args }) => args.withdrawal.tokenIndex);
  const uniqueTokenIndexes = [...new Set(tokenIndexes)];

  const tokenDetails = await fetchTokenData(l1Client, uniqueTokenIndexes);
  return new Map(tokenDetails.map((token) => [token.tokenIndex, token]));
};

const fetchBlocksInBatches = async (
  l2Client: PublicClient,
  blockNumbers: bigint[],
  batchSize = 100,
) => {
  const batches = [];
  for (let i = 0; i < blockNumbers.length; i += batchSize) {
    batches.push(blockNumbers.slice(i, i + batchSize));
  }

  const blocks = [];
  for (const batch of batches) {
    const batchPromises = batch.map((blockNumber) => l2Client.getBlock({ blockNumber }));

    if (blocks.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const batchResults = await Promise.all(batchPromises);
    blocks.push(...batchResults);

    logger.info(`Processed batch of ${batch.length} blocks. Total blocks so far: ${blocks.length}`);
  }

  return blocks;
};
