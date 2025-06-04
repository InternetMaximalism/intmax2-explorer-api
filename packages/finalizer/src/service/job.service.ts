import {
  Event,
  type EventData,
  FIRESTORE_DOCUMENT_EVENTS,
  createNetworkClient,
} from "@intmax2-explorer-api/shared";
import { finalizePendingBlocks } from "./block.service";
import { finalizeRelayedWithdrawals } from "./withdrawal.service";

export const performJob = async (): Promise<void> => {
  const withdrawalEvent = new Event(FIRESTORE_DOCUMENT_EVENTS.WITHDRAWAL);

  const [lastWithdrawalProcessedEvent, { ethereumClient, currentBlockNumber }] = await Promise.all([
    withdrawalEvent.getLatestEvent<EventData>(),
    getEthereumAndScrollBlockNumbers(),
  ]);

  await Promise.all([
    finalizePendingBlocks(),
    finalizeRelayedWithdrawals({
      ethereumClient,
      currentBlockNumber,
      withdrawalEvent,
      lastWithdrawalProcessedEvent,
    }),
  ]);
};

const getEthereumAndScrollBlockNumbers = async () => {
  const ethereumClient = createNetworkClient("ethereum");

  const currentBlockNumber = await ethereumClient.getBlockNumber();

  return {
    ethereumClient,
    currentBlockNumber,
  };
};
