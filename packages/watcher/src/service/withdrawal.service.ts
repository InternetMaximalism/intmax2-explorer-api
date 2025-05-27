import {
  TransactionStatus,
  type DirectWithdrawalSuccessedEvent,
  type WithdrawalClaimableEvent,
  Withdrawal,
  logger,
  type WithdrawalInput,
  type WithdrawalType,
} from "@intmax2-explorer-api/shared";
import { WITHDRAWAL_BATCH_SIZE } from "../constants";
import type { FetchAndStoreWithdrawalsParams } from "../types";
import { handleAllWithdrawalEvents } from "./event.service";

export const fetchAndStoreWithdrawals = async ({
  ethereumClient,
  currentBlockNumber,
  withdrawalEvent,
  lastWithdrawalProcessedEvent,
}: FetchAndStoreWithdrawalsParams) => {
  const { directWithdrawals, claimableWithdrawals } = await handleAllWithdrawalEvents(
    ethereumClient,
    currentBlockNumber,
    lastWithdrawalProcessedEvent,
  );

  const formattedDirectWithdrawals = directWithdrawals.map((event) =>
    formatWithdrawalEvent(event, "direct"),
  );
  const formattedClaimableWithdrawals = claimableWithdrawals.map((event) =>
    formatWithdrawalEvent(event, "claimable"),
  );
  const formattedWithdrawals = [...formattedDirectWithdrawals, ...formattedClaimableWithdrawals];

  const withdrawal = Withdrawal.getInstance();

  for (let i = 0; i < formattedWithdrawals.length; i += WITHDRAWAL_BATCH_SIZE) {
    const batch = formattedWithdrawals.slice(i, i + WITHDRAWAL_BATCH_SIZE);
    await withdrawal.addWithdrawalsBatch(batch);
    logger.info(
      `Processed withdrawal batch ${Math.floor(i / WITHDRAWAL_BATCH_SIZE) + 1} of ${Math.ceil(formattedWithdrawals.length / WITHDRAWAL_BATCH_SIZE)}`,
    );
  }

  await withdrawalEvent.addOrUpdateEvent({
    lastBlockNumber: Number(currentBlockNumber),
  });

  logger.info(`Completed indexing withdrawals for ${formattedWithdrawals.length} withdrawals`);
};

const formatWithdrawalEvent = (
  event: DirectWithdrawalSuccessedEvent | WithdrawalClaimableEvent,
  type: WithdrawalType,
) => {
  return {
    hash: event.args.withdrawalHash,
    status: "Indexing" as TransactionStatus,
    liquidityTransactionHash: event.transactionHash,
    liquidityTimestamp: event.blockTimestamp,
    type,
  } as unknown as WithdrawalInput;
};
