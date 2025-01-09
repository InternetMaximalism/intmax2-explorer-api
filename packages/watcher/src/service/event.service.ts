import {
  BLOCK_RANGE_MINIMUM,
  DirectWithdrawalSuccessedEvent,
  EventData,
  WithdrawalClaimableEvent,
  directWithdrawalSuccessedEvent,
  fetchEvents,
  getStartBlockNumber,
  logger,
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
  logger.info(
    `Fetching ${params.eventName} events from block ${params.startBlockNumber} to ${params.endBlockNumber}`,
  );

  const events = await fetchEvents<T>(ethereumClient, {
    startBlockNumber: params.startBlockNumber,
    endBlockNumber: params.endBlockNumber,
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
