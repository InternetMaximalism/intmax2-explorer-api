export type EventData = {
  id: string;
  lastBlockNumber: number;
};

export type DepositAnalyzedAndRelayedEventData = EventData & {
  lastUpToDepositId: number;
};

export type WithdrawalQueuedEventData = EventData;
