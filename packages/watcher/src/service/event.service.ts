import {
  BLOCK_RANGE_MINIMUM,
  type DirectWithdrawalSuccessedEvent,
  type EventData,
  LIQUIDITY_CONTRACT_ADDRESS,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  type WithdrawalClaimableEvent,
  directWithdrawalSuccessedEvent,
  fetchEvents,
  getStartBlockNumber,
  withdrawalClaimableEvent,
} from "@intmax2-explorer-api/shared";
import { parseAbiItem } from "abitype";
import type { PublicClient } from "viem";

const handleWithdrawalEvent = async <T extends { args: { withdrawalHash: string } }>(
  ethereumClient: PublicClient,
  params: {
    startBlockNumber: bigint;
    endBlockNumber: bigint;
    eventInterface: ReturnType<typeof parseAbiItem>;
  },
) => {
  const { startBlockNumber, endBlockNumber } = params;

  const events = await fetchEvents<T>(ethereumClient, {
    startBlockNumber,
    endBlockNumber,
    blockRange: BLOCK_RANGE_MINIMUM,
    contractAddress: LIQUIDITY_CONTRACT_ADDRESS,
    eventInterface: params.eventInterface,
  });

  return events;
};

export const handleAllWithdrawalEvents = async (
  ethereumClient: PublicClient,
  currentBlockNumber: bigint,
  lastProcessedEvent: EventData | null,
) => {
  const startBlockNumber = getStartBlockNumber(
    lastProcessedEvent,
    LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  );

  const [directWithdrawals, claimableWithdrawals] = await Promise.all([
    handleWithdrawalEvent<DirectWithdrawalSuccessedEvent>(ethereumClient, {
      startBlockNumber,
      endBlockNumber: currentBlockNumber,
      eventInterface: directWithdrawalSuccessedEvent,
    }),
    handleWithdrawalEvent<WithdrawalClaimableEvent>(ethereumClient, {
      startBlockNumber,
      endBlockNumber: currentBlockNumber,
      eventInterface: withdrawalClaimableEvent,
    }),
  ]);

  return {
    directWithdrawals,
    claimableWithdrawals,
  };
};
