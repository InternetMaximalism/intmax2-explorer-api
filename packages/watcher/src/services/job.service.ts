import {
  createNetworkClient,
  Event,
  type EventData,
  FIRESTORE_DOCUMENT_EVENTS,
} from "@intmax2-explorer-api/shared";
import { fetchAndStoreBlocks } from "./block.service";
import { fetchAndStoreDeposits } from "./deposit.service";
import { fetchAndStoreWithdrawals } from "./withdrawal.service";

export const performJob = async (): Promise<void> => {
  const blockEvent = new Event(FIRESTORE_DOCUMENT_EVENTS.BLOCK);
  const depositEvent = new Event(FIRESTORE_DOCUMENT_EVENTS.DEPOSIT);
  const withdrawalQueueEvent = new Event(FIRESTORE_DOCUMENT_EVENTS.WITHDRAWAL_QUEUE);

  const [
    lastBlockProcessedEvent,
    lastDepositProcessedEvent,
    lastWithdrawalQueueProcessedEvent,
    { l1Client, currentBlockNumber, l2Client, scrollCurrentBlockNumber },
  ] = await Promise.all([
    blockEvent.getLatestEvent<EventData>(),
    depositEvent.getLatestEvent<EventData>(),
    withdrawalQueueEvent.getLatestEvent<EventData>(),
    getEthereumAndScrollBlockNumbers(),
  ]);

  await Promise.all([
    fetchAndStoreBlocks(l2Client, scrollCurrentBlockNumber, blockEvent, lastBlockProcessedEvent),
    fetchAndStoreDeposits(l1Client, currentBlockNumber, depositEvent, lastDepositProcessedEvent),
    fetchAndStoreWithdrawals({
      l1Client,
      l2Client,
      scrollCurrentBlockNumber,
      lastWithdrawalQueueProcessedEvent,
      withdrawalQueueEvent,
    }),
  ]);
};

const getEthereumAndScrollBlockNumbers = async () => {
  const l1Client = createNetworkClient("l1");
  const l2Client = createNetworkClient("l2");

  const [currentBlockNumber, scrollCurrentBlockNumber] = await Promise.all([
    l1Client.getBlockNumber(),
    l2Client.getBlockNumber(),
  ]);

  return {
    l1Client,
    l2Client,
    currentBlockNumber,
    scrollCurrentBlockNumber,
  };
};
