import {
  Event,
  type EventData,
  FIRESTORE_DOCUMENT_EVENTS,
  createNetworkClient,
} from "@intmax2-explorer-api/shared";
import { finalizeIndexedWithdrawals } from "./withdrawal.service";

export const performJob = async (): Promise<void> => {
  const withdrawalQueueEvent = new Event(FIRESTORE_DOCUMENT_EVENTS.WITHDRAWAL_QUEUE);

  const [
    lastWithdrawalQueueProcessedEvent,
    { ethereumClient, currentBlockNumber, scrollClient, scrollCurrentBlockNumber },
  ] = await Promise.all([
    withdrawalQueueEvent.getLatestEvent<EventData>(),
    getEthereumAndScrollBlockNumbers(),
  ]);

  await Promise.all([
    finalizeIndexedWithdrawals({
      ethereumClient,
      currentBlockNumber,
      scrollClient,
      scrollCurrentBlockNumber,
      lastWithdrawalQueueProcessedEvent,
      withdrawalQueueEvent,
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
