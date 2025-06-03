import {
  Event,
  type EventData,
  FIRESTORE_DOCUMENT_EVENTS,
  createNetworkClient,
} from "@intmax2-explorer-api/shared";
import { finalizePendingBlocks } from "./block.service";
import { finalizeIndexedWithdrawals } from "./withdrawal.service";

export const performJob = async (): Promise<void> => {
  const withdrawalEvent = new Event(FIRESTORE_DOCUMENT_EVENTS.WITHDRAWAL);

  const [
    lastWithdrawalProcessedEvent,
    { ethereumClient, currentBlockNumber, scrollClient, scrollCurrentBlockNumber },
  ] = await Promise.all([
    withdrawalEvent.getLatestEvent<EventData>(),
    getEthereumAndScrollBlockNumbers(),
  ]);

  await Promise.all([
    finalizePendingBlocks(),
    finalizeIndexedWithdrawals({
      ethereumClient,
      currentBlockNumber,
      scrollClient,
      scrollCurrentBlockNumber,
      lastWithdrawalProcessedEvent,
      withdrawalEvent,
    }),
  ]);
};
const getEthereumAndScrollBlockNumbers = async () => {
  const ethereumClient = createNetworkClient("ethereum");
  const scrollClient = createNetworkClient("scroll");

  const [currentBlockNumber, scrollCurrentBlockNumber] = await Promise.all([
    ethereumClient.getBlockNumber(),
    scrollClient.getBlockNumber(),
  ]);

  return {
    ethereumClient,
    scrollClient,
    currentBlockNumber,
    scrollCurrentBlockNumber,
  };
};
