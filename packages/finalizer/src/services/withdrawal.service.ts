import {
  BLOCK_RANGE_MINIMUM,
  type ClaimableWithdrawalEvent,
  createNetworkClient,
  type DirectWithdrawalQueueEvent,
  directWithdrawalSuccessedEvent,
  Event,
  type EventData,
  FIRESTORE_DOCUMENT_EVENTS,
  fetchEvents,
  getStartBlockNumber,
  LIQUIDITY_CONTRACT_ADDRESS,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  logger,
  validateBlockRange,
  WITHDRAWAL_BATCH_SIZE,
  Withdrawal,
  type WithdrawalInput,
  withdrawalClaimableEvent,
} from "@intmax2-explorer-api/shared";
import { fromHex, type PublicClient, parseAbiItem } from "viem";
import type { RelayedWithdrawal } from "../types";

export const finalizeRelayedWithdrawals = async () => {
  const withdrawalEvent = new Event(FIRESTORE_DOCUMENT_EVENTS.WITHDRAWAL);
  const [lastEvent, { ethereumClient, currentBlockNumber }] = await Promise.all([
    withdrawalEvent.getLatestEvent<EventData>(),
    getEthereumAndScrollBlockNumbers(),
  ]);

  const startBlockNumber = getStartBlockNumber(lastEvent, LIQUIDITY_CONTRACT_DEPLOYED_BLOCK);
  const isValid = validateBlockRange(
    "finalizeRelayedWithdrawals",
    startBlockNumber,
    currentBlockNumber,
  );
  if (!isValid) {
    logger.info("Skipping finalizeRelayedWithdrawals due to invalid block range.");
    return;
  }

  const withdrawalInstance = Withdrawal.getInstance();
  const { directWithdrawals, claimableWithdrawals, totalCount } =
    await getRelayedWithdrawals(withdrawalInstance);

  const withdrawalEvents = await Promise.all([
    fetchWithdrawalEvents<DirectWithdrawalQueueEvent>(
      ethereumClient,
      startBlockNumber,
      currentBlockNumber,
      directWithdrawals,
      directWithdrawalSuccessedEvent,
    ),
    fetchWithdrawalEvents<ClaimableWithdrawalEvent>(
      ethereumClient,
      startBlockNumber,
      currentBlockNumber,
      claimableWithdrawals,
      withdrawalClaimableEvent,
    ),
  ]).then((processed) => processed.flat());

  const withdrawalEventMap = new Map<
    string,
    DirectWithdrawalQueueEvent | ClaimableWithdrawalEvent
  >();
  withdrawalEvents.forEach((event) => {
    withdrawalEventMap.set(event.args.withdrawalHash, event);
  });

  const matchedWithdrawals = [...directWithdrawals, ...claimableWithdrawals].filter((w) =>
    withdrawalEventMap.has(w.hash),
  );

  for (let i = 0; i < matchedWithdrawals.length; i += WITHDRAWAL_BATCH_SIZE) {
    const batch = matchedWithdrawals.slice(i, i + WITHDRAWAL_BATCH_SIZE);
    const batchUpdates = batch.map((withdrawal) => {
      const event = withdrawalEventMap.get(withdrawal.hash);
      if (!event) {
        logger.error(`No event found for withdrawal hash: ${withdrawal.hash}`);
        return null;
      }

      return {
        hash: withdrawal.hash,
        status: "Completed",
        liquidityTransactionHash: event.transactionHash,
        liquidityTimestamp: fromHex(event.blockTimestamp as `0x${string}`, "number"),
      };
    });

    await withdrawalInstance.updateWithdrawalsBatch(
      batchUpdates.filter((update): update is WithdrawalInput => update !== null),
    );

    logger.info(
      `Processed withdrawal batch ${Math.floor(i / WITHDRAWAL_BATCH_SIZE) + 1} of ${Math.ceil(withdrawalEvents.length / WITHDRAWAL_BATCH_SIZE)}`,
    );
  }

  await withdrawalEvent.addOrUpdateEvent({
    lastBlockNumber: Number(currentBlockNumber),
  });

  logger.info(
    `Completed completed withdrawals: ${withdrawalEvents.length} / ${totalCount} added total withdrawals`,
  );
};

const getRelayedWithdrawals = async (withdrawalInstance: Withdrawal) => {
  const { items: indexingWithdrawals, totalCount } = await withdrawalInstance.listAllWithdrawals({
    status: "Relayed",
    orderBy: "relayedTimestamp",
  });

  return {
    directWithdrawals: indexingWithdrawals.filter((w) => w.type === "direct"),
    claimableWithdrawals: indexingWithdrawals.filter((w) => w.type === "claimable"),
    totalCount,
  };
};

const fetchWithdrawalEvents = async <T>(
  ethereumClient: PublicClient,
  startBlockNumber: bigint,
  currentBlockNumber: bigint,
  withdrawals: RelayedWithdrawal[],
  eventInterface: ReturnType<typeof parseAbiItem>,
) => {
  const withdrawalHashes = withdrawals.map(({ hash }) => hash);

  const events = await fetchEvents<T>(ethereumClient, {
    startBlockNumber: startBlockNumber,
    endBlockNumber: currentBlockNumber,
    blockRange: BLOCK_RANGE_MINIMUM,
    contractAddress: LIQUIDITY_CONTRACT_ADDRESS,
    eventInterface: eventInterface,
    args: {
      withdrawalHash: withdrawalHashes,
    },
  });

  return events;
};

const getEthereumAndScrollBlockNumbers = async () => {
  const ethereumClient = createNetworkClient("l1");

  const currentBlockNumber = await ethereumClient.getBlockNumber();

  return {
    ethereumClient,
    currentBlockNumber,
  };
};
