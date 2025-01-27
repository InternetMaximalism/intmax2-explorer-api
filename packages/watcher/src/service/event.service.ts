import {
  BLOCK_RANGE_MINIMUM,
  type DirectWithdrawalSuccessedEvent,
  type EventData,
  type WithdrawalClaimableEvent,
  directWithdrawalSuccessedEvent,
  fetchEvents,
  getStartBlockNumber,
  validateBlockRange,
  withdrawalClaimableEvent,
} from "@intmax2-explorer-api/shared";
import { parseAbiItem } from "abitype";
import type { PublicClient } from "viem";
import { LIQUIDITY_CONTRACT_ADDRESS, LIQUIDITY_CONTRACT_DEPLOYED_BLOCK } from "../constants";
import type { WithdrawalEventType } from "../types";

const handleWithdrawalEvent = async <T extends { args: { withdrawalHash: string } }>(
  ethereumClient: PublicClient,
  params: {
    startBlockNumber: bigint;
    endBlockNumber: bigint;
    eventInterface: ReturnType<typeof parseAbiItem>;
    eventName: WithdrawalEventType;
  },
) => {
  const { eventName, startBlockNumber, endBlockNumber } = params;
  validateBlockRange(eventName, startBlockNumber, endBlockNumber);

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
      eventName: "DirectWithdrawalSuccessed",
    }),
    handleWithdrawalEvent<WithdrawalClaimableEvent>(ethereumClient, {
      startBlockNumber,
      endBlockNumber: currentBlockNumber,
      eventInterface: withdrawalClaimableEvent,
      eventName: "WithdrawalClaimable",
    }),
  ]);

  return {
    directWithdrawals,
    claimableWithdrawals,
  };
};
