import {
  BLOCK_RANGE_MINIMUM,
  type ClaimableWithdrawalEvent,
  type DirectWithdrawalQueueEvent,
  type EventData,
  LIQUIDITY_CONTRACT_ADDRESS,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  TransactionStatus,
  WITHDRAWAL_BATCH_SIZE,
  Withdrawal,
  WithdrawalInput,
  directWithdrawalSuccessedEvent,
  fetchEvents,
  getStartBlockNumber,
  logger,
  validateBlockRange,
  withdrawalClaimableEvent,
} from "@intmax2-explorer-api/shared";
import { type PublicClient, fromHex, parseAbiItem } from "viem";
import type { FinalizeIndexedWithdrawalsParams, RelayedWithdrawal } from "../types";

export const finalizeIndexedWithdrawals = async ({
  ethereumClient,
  currentBlockNumber,
  lastWithdrawalProcessedEvent,
  withdrawalEvent,
}: FinalizeIndexedWithdrawalsParams) => {
  const withdrawal = Withdrawal.getInstance();
  const { directWithdrawals, claimableWithdrawals, totalCount } =
    await getRelayedWithdrawals(withdrawal);

  const withdrawalDetails = await Promise.all([
    fetchWithdrawalEvents<DirectWithdrawalQueueEvent>(
      ethereumClient,
      lastWithdrawalProcessedEvent,
      currentBlockNumber,
      directWithdrawals,
      directWithdrawalSuccessedEvent,
      "DirectWithdrawalSuccessed",
    ),
    fetchWithdrawalEvents<ClaimableWithdrawalEvent>(
      ethereumClient,
      lastWithdrawalProcessedEvent,
      currentBlockNumber,
      claimableWithdrawals,
      withdrawalClaimableEvent,
      "WithdrawalClaimable",
    ),
  ]).then((processed) => processed.flat());

  const withdrawalEventMap = new Map<
    string,
    DirectWithdrawalQueueEvent | ClaimableWithdrawalEvent
  >();
  withdrawalDetails.forEach((event) => {
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
        logger.warn(`No event found for withdrawal hash: ${withdrawal.hash}`);
        return null;
      }

      return {
        hash: withdrawal.hash,
        status: "Completed" as TransactionStatus,
        liquidityTransactionHash: event.transactionHash,
        liquidityTimestamp: fromHex(event.blockTimestamp as `0x${string}`, "number"),
      };
    });

    await withdrawal.updateWithdrawalsBatch(
      batchUpdates.filter((update): update is WithdrawalInput => update !== null),
    );

    logger.info(
      `Processed withdrawal batch ${Math.floor(i / WITHDRAWAL_BATCH_SIZE) + 1} of ${Math.ceil(withdrawalDetails.length / WITHDRAWAL_BATCH_SIZE)}`,
    );
  }

  withdrawalEvent.addOrUpdateEvent({
    lastBlockNumber: Number(currentBlockNumber),
  });

  logger.info(
    `Completed completed withdrawals: ${withdrawalDetails.length} / ${totalCount} added total withdrawals`,
  );
};

const getRelayedWithdrawals = async (withdrawal: Withdrawal) => {
  const { items: indexingWithdrawals, totalCount } = await withdrawal.listAllWithdrawals({
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
  lastWithdrawalProcessedEvent: EventData | null,
  currentBlockNumber: bigint,
  withdrawals: RelayedWithdrawal[],
  eventInterface: ReturnType<typeof parseAbiItem>,
  eventName: "DirectWithdrawalSuccessed" | "WithdrawalClaimable",
) => {
  const startBlockNumber = getStartBlockNumber(
    lastWithdrawalProcessedEvent,
    LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  );
  validateBlockRange(eventName, startBlockNumber, currentBlockNumber);

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
