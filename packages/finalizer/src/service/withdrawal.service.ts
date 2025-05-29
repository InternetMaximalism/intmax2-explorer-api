import {
  Withdrawal,
  type DirectWithdrawalQueueEvent,
  type EventData,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  fetchEvents,
  getStartBlockNumber,
  validateBlockRange,
  BLOCK_RANGE_MINIMUM,
  LIQUIDITY_CONTRACT_ADDRESS,
  directWithdrawalSuccessedEvent,
  withdrawalClaimableEvent,
} from "@intmax2-explorer-api/shared";
import { type PublicClient, parseAbiItem } from "viem";
import type { FinalizeIndexedWithdrawalsParams, RelayedWithdrawal } from "../types";

export const finalizeIndexedWithdrawals = async ({
  ethereumClient,
  currentBlockNumber,
  lastWithdrawalProcessedEvent,
}: FinalizeIndexedWithdrawalsParams) => {
  const withdrawal = Withdrawal.getInstance();
  const { directWithdrawals, claimableWithdrawals, totalCount } =
    await getRelayedWithdrawals(withdrawal);

  console.log("Total relayed withdrawals:", directWithdrawals);
  console.log("Total relayed withdrawals:", claimableWithdrawals);
  console.log("Total relayed withdrawals:", totalCount);

  const withdrawalDetails = await Promise.all([
    fetchWithdrawalEvents(
      ethereumClient,
      lastWithdrawalProcessedEvent,
      currentBlockNumber,
      directWithdrawals,
      directWithdrawalSuccessedEvent,
      "DirectWithdrawalSuccessed",
    ),
    fetchWithdrawalEvents(
      ethereumClient,
      lastWithdrawalProcessedEvent,
      currentBlockNumber,
      claimableWithdrawals,
      withdrawalClaimableEvent,
      "WithdrawalClaimable",
    ),
  ]).then((processed) => processed.flat());

  console.log(withdrawalDetails.length);
};

const getRelayedWithdrawals = async (withdrawal: Withdrawal) => {
  const { items: indexingWithdrawals, totalCount } = await withdrawal.getAll({
    status: "Relayed",
    orderBy: "relayedTimestamp",
  });

  return {
    directWithdrawals: indexingWithdrawals.filter((w) => w.type === "direct"),
    claimableWithdrawals: indexingWithdrawals.filter((w) => w.type === "claimable"),
    totalCount,
  };
};

const fetchWithdrawalEvents = async (
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

  const events = await fetchEvents<DirectWithdrawalQueueEvent>(ethereumClient, {
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
