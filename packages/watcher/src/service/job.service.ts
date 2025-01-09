import {
  Alchemy,
  Event,
  type EventData,
  FIRESTORE_DOCUMENT_EVENTS,
  createNetworkClient,
} from "@intmax2-explorer-api/shared";
import { fetchAndStoreBlocks } from "./block.service";
import { fetchAndStoreDeposits } from "./deposit.service";
import { fetchAndStoreWithdrawals } from "./withdrawal.service";

export const performJob = async (): Promise<void> => {
  const blockEvent = new Event(FIRESTORE_DOCUMENT_EVENTS.BLOCK);
  const depositEvent = new Event(FIRESTORE_DOCUMENT_EVENTS.DEPOSIT);
  const withdrawalEvent = new Event(FIRESTORE_DOCUMENT_EVENTS.WITHDRAWAL);
  const withdrawalQueueEvent = new Event(FIRESTORE_DOCUMENT_EVENTS.WITHDRAWAL_QUEUE);

  const [
    lastBlockProcessedEvent,
    lastDepositProcessedEvent,
    lastWithdrawalProcessedEvent,
    lastWithdrawalQueueProcessedEvent,
    { ethereumClient, currentBlockNumber, scrollClient, scrollCurrentBlockNumber, scrollAlchemy },
  ] = await Promise.all([
    blockEvent.getLatestEvent<EventData>(),
    depositEvent.getLatestEvent<EventData>(),
    withdrawalEvent.getLatestEvent<EventData>(),
    withdrawalQueueEvent.getLatestEvent<EventData>(),
    getEthereumAndScrollBlockNumbers(),
  ]);

  await Promise.all([
    fetchAndStoreBlocks(
      scrollClient,
      scrollCurrentBlockNumber,
      scrollAlchemy,
      blockEvent,
      lastBlockProcessedEvent,
    ),
    fetchAndStoreDeposits(
      ethereumClient,
      currentBlockNumber,
      depositEvent,
      lastDepositProcessedEvent,
    ),
    fetchAndStoreWithdrawals({
      ethereumClient,
      currentBlockNumber,
      scrollClient,
      scrollCurrentBlockNumber,
      scrollAlchemy,
      lastWithdrawalProcessedEvent,
      lastWithdrawalQueueProcessedEvent,
      withdrawalEvent,
      withdrawalQueueEvent,
    }),
  ]);
};

const getEthereumAndScrollBlockNumbers = async () => {
  const ethereumClient = createNetworkClient("ethereum");
  const scrollClient = createNetworkClient("scroll");
  const scrollAlchemy = new Alchemy("scroll");

  const [currentBlockNumber, scrollCurrentBlockNumber] = await Promise.all([
    ethereumClient.getBlockNumber(),
    scrollClient.getBlockNumber(),
  ]);

  return {
    ethereumClient,
    scrollClient,
    currentBlockNumber,
    scrollCurrentBlockNumber,
    scrollAlchemy,
  };
};
