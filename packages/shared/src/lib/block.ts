import type { EventData } from "../types";

export const getStartBlockNumber = (
  lastProcessedEvent: EventData | null,
  deployedBlockNumber: bigint,
) => {
  return BigInt(
    lastProcessedEvent?.lastBlockNumber
      ? lastProcessedEvent.lastBlockNumber + 1
      : deployedBlockNumber,
  );
};
