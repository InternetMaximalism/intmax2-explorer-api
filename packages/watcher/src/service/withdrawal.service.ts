import {
  Alchemy,
  BLOCK_RANGE_MOST_RECENT,
  type ClaimableWithdrawalEvent,
  type DirectWithdrawalQueueEvent,
  type EventData,
  TransactionStatus,
  Withdrawal,
  WithdrawalEvent,
  type WithdrawalInput,
  claimableWithdrawalQueuedEvent,
  db,
  directWithdrawalQueuedEvent,
  fetchEvents,
  getStartBlockNumber,
  logger,
} from "@intmax2-explorer-api/shared";
import { parseAbiItem } from "abitype";
import type { PublicClient } from "viem";
import {
  WITHDRAWAL_BATCH_SIZE,
  WITHDRAWAL_CONTRACT_ADDRESS,
  WITHDRAWAL_CONTRACT_DEPLOYED_BLOCK,
} from "../constants";
import type { FetchAndStoreWithdrawalsParams, TokenInfo } from "../types";
import { handleAllWithdrawalEvents } from "./event.service";
import { fetchTokenData } from "./token.service";

export const fetchAndStoreWithdrawals = async ({
  ethereumClient,
  currentBlockNumber,
  scrollClient,
  scrollCurrentBlockNumber,
  scrollAlchemy,
  lastWithdrawalProcessedEvent,
  lastWithdrawalQueueProcessedEvent,
  withdrawalEvent,
  withdrawalQueueEvent,
}: FetchAndStoreWithdrawalsParams) => {
  const { directWithdrawals, claimableWithdrawals } = await handleAllWithdrawalEvents(
    ethereumClient,
    currentBlockNumber,
    lastWithdrawalProcessedEvent,
  );

  const [directWithdrawalQueuedEvents, claimableWithdrawalEvents] = await Promise.all([
    processQueueEvents(
      scrollClient,
      lastWithdrawalQueueProcessedEvent,
      scrollCurrentBlockNumber,
      directWithdrawalQueuedEvent,
      directWithdrawals,
    ),
    processQueueEvents(
      scrollClient,
      lastWithdrawalQueueProcessedEvent,
      scrollCurrentBlockNumber,
      claimableWithdrawalQueuedEvent,
      claimableWithdrawals,
    ),
  ]);

  const tokenIndexes = [
    ...directWithdrawalQueuedEvents.map(({ args }) => args.withdrawal.tokenIndex),
    ...claimableWithdrawalEvents.map(({ args }) => args.withdrawal.tokenIndex),
  ];
  const uniqueTokenIndexes = Array.from(new Set(tokenIndexes));
  const tokenDetails = await fetchTokenData(ethereumClient, uniqueTokenIndexes);
  const tokenDetailsMap = new Map(tokenDetails.map((token) => [token.tokenIndex, token]));

  const withdrawalDetails = await Promise.all([
    processWithdrawalEvents(directWithdrawalQueuedEvents, scrollAlchemy, tokenDetailsMap),
    processWithdrawalEvents(claimableWithdrawalEvents, scrollAlchemy, tokenDetailsMap),
  ]).then((processed) => processed.flat());

  const withdrawal = Withdrawal.getInstance();

  for (let i = 0; i < withdrawalDetails.length; i += WITHDRAWAL_BATCH_SIZE) {
    const batch = withdrawalDetails.slice(i, i + WITHDRAWAL_BATCH_SIZE);
    await withdrawal.addWithdrawalsBatch(batch);
    logger.info(
      `Processed withdrawal batch ${Math.floor(i / WITHDRAWAL_BATCH_SIZE) + 1} of ${Math.ceil(withdrawalDetails.length / WITHDRAWAL_BATCH_SIZE)}`,
    );
  }

  await db.runTransaction(async (transaction) => {
    await Promise.all([
      withdrawalEvent.addOrUpdateEventWithTransaction(transaction, {
        lastBlockNumber: Number(currentBlockNumber),
      }),
      withdrawalQueueEvent.addOrUpdateEventWithTransaction(transaction, {
        lastBlockNumber: Number(scrollCurrentBlockNumber),
      }),
    ]);
  });

  logger.info(`Completed processing withdrawals for ${withdrawalDetails.length} withdrawals`);
};

const processQueueEvents = async (
  scrollClient: PublicClient,
  lastWithdrawalQueueProcessedEvent: EventData | null,
  scrollCurrentBlockNumber: bigint,
  eventInterface: ReturnType<typeof parseAbiItem>,
  withdrawalEvents: WithdrawalEvent[],
) => {
  if (withdrawalEvents.length === 0) {
    return [];
  }

  const startQueueBlockNumber = getStartBlockNumber(
    lastWithdrawalQueueProcessedEvent,
    WITHDRAWAL_CONTRACT_DEPLOYED_BLOCK,
  );

  if (startQueueBlockNumber > scrollCurrentBlockNumber) {
    throw new Error(
      `Invalid block range: start (${startQueueBlockNumber}) is greater than end (${scrollCurrentBlockNumber})`,
    );
  }

  let currentStartBlockNumber = startQueueBlockNumber - BLOCK_RANGE_MOST_RECENT;
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  const withdrawalMap = new Map(
    withdrawalEvents.map((event) => [event.args.withdrawalHash, event.transactionHash]),
  );
  const withdrawalHashes = withdrawalEvents.map(({ args }) => args.withdrawalHash);

  // NOTE: Ethereum and Scroll have different BlockNumbers, so we are considering that
  while (attempts < MAX_ATTEMPTS) {
    const events = await fetchEvents<DirectWithdrawalQueueEvent>(scrollClient, {
      startBlockNumber: currentStartBlockNumber,
      endBlockNumber: scrollCurrentBlockNumber,
      blockRange: BLOCK_RANGE_MOST_RECENT, // NOTE: When not using a mock, this might not be sufficient.
      contractAddress: WITHDRAWAL_CONTRACT_ADDRESS,
      eventInterface: eventInterface,
      args: {
        withdrawalHash: withdrawalHashes,
      },
    });

    logger.info(`processQueueEvents found ${events.length}/${withdrawalEvents.length} events`);

    // FIXME: There are cases where events.length !== withdrawalEvents.length => This is because the same withdrawal request is registered multiple times.
    if (events.length === withdrawalEvents.length) {
      const eventMaps = events.map((event) => ({
        ...event,
        liquidityTransactionHash: withdrawalMap.get(event.args.withdrawalHash),
      }));
      return eventMaps;
    }

    currentStartBlockNumber -= BLOCK_RANGE_MOST_RECENT;
    attempts++;

    if (currentStartBlockNumber <= 0n) {
      throw new Error("Start block number would become negative");
    }
  }

  throw new Error("Failed to fetch all withdrawal events");
};

const processWithdrawalEvents = async (
  events: ClaimableWithdrawalEvent[] | DirectWithdrawalQueueEvent[],
  scrollAlchemy: Alchemy,
  tokenDetailsMap: Map<number, TokenInfo>,
): Promise<WithdrawalInput[]> => {
  if (events.length === 0) {
    return [];
  }

  const blockNumbers = [...new Set(events.map((event) => event.blockNumber))];
  const blocks = await fetchBlocksInBatches(blockNumbers, scrollAlchemy);
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
      recipient: event.args.recipient,
      tokenIndex: event.args.withdrawal.tokenIndex,
      tokenType: Number(tokenDetail.tokenType),
      amount: String(event.args.withdrawal.amount),
      blockNumber: Number(event.blockNumber),
      hash: event.args.withdrawalHash,
      timestamp: block.timestamp,
      status: "Completed" as TransactionStatus,
      liquidityTransactionHash: (event as unknown as { liquidityTransactionHash: string })
        .liquidityTransactionHash,
    };
  });
};

const fetchBlocksInBatches = async (
  blockNumbers: bigint[],
  scrollAlchemy: Alchemy,
  batchSize = 100,
) => {
  const batches = [];
  for (let i = 0; i < blockNumbers.length; i += batchSize) {
    batches.push(blockNumbers.slice(i, i + batchSize));
  }

  const blocks = [];
  for (const batch of batches) {
    const batchPromises = batch.map((blockNumber) => scrollAlchemy.getBlock(blockNumber));

    if (blocks.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const batchResults = await Promise.all(batchPromises);
    blocks.push(...batchResults);

    console.log(`Processed batch of ${batch.length} blocks. Total blocks so far: ${blocks.length}`);
  }

  return blocks;
};
