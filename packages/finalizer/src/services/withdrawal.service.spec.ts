import {
  BLOCK_RANGE_MIN,
  type ClaimableWithdrawalEvent,
  createNetworkClient,
  type DirectWithdrawalQueueEvent,
  directWithdrawalSuccessedEvent,
  Event,
  type EventData,
  FIRESTORE_DOCUMENT_EVENTS,
  fetchEvents,
  getStartBlockNumber,
  LIQUIDITY_CONTRACT_ADDRESS,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  logger,
  validateBlockRange,
  WITHDRAWAL_BATCH_SIZE,
  Withdrawal,
  withdrawalClaimableEvent,
} from "@intmax2-explorer-api/shared";
import { fromHex, type PublicClient } from "viem";
import { beforeEach, describe, expect, it, type MockedFunction, vi } from "vitest";
import type { RelayedWithdrawal } from "../types";
import { finalizeRelayedWithdrawals } from "./withdrawal.service";

vi.mock("@intmax2-explorer-api/shared", () => ({
  BLOCK_RANGE_MIN: 1000,
  FIRESTORE_DOCUMENT_EVENTS: {
    WITHDRAWAL: "withdrawal-events",
  },
  LIQUIDITY_CONTRACT_ADDRESS: "0x123",
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK: 1000000n,
  WITHDRAWAL_BATCH_SIZE: 10,
  Event: vi.fn(),
  Withdrawal: {
    getInstance: vi.fn(),
  },
  createNetworkClient: vi.fn(),
  directWithdrawalSuccessedEvent: { mock: "event" },
  fetchEvents: vi.fn(),
  getStartBlockNumber: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
  validateBlockRange: vi.fn(),
  withdrawalClaimableEvent: { mock: "event" },
}));

vi.mock("viem", () => ({
  fromHex: vi.fn(),
  parseAbiItem: vi.fn(),
}));

describe("withdrawal.service", () => {
  let mockEthereumClient: PublicClient;
  let mockWithdrawalInstance: {
    listAllWithdrawals: MockedFunction<any>;
    updateWithdrawalsBatch: MockedFunction<any>;
  };
  let mockWithdrawalEvent: {
    getLatestEvent: MockedFunction<any>;
    addOrUpdateEvent: MockedFunction<any>;
  };

  const mockDirectWithdrawals: RelayedWithdrawal[] = [
    {
      hash: "0xdirect1",
      type: "direct",
      status: "Relayed",
      liquidityTransactionHash: "0xtx1",
    },
    {
      hash: "0xdirect2",
      type: "direct",
      status: "Relayed",
      liquidityTransactionHash: "0xtx2",
    },
  ];

  const mockClaimableWithdrawals: RelayedWithdrawal[] = [
    {
      hash: "0xclaimable1",
      type: "claimable",
      status: "Relayed",
      liquidityTransactionHash: "0xtx3",
    },
  ];

  const mockDirectWithdrawalEvents: DirectWithdrawalQueueEvent[] = [
    {
      args: { withdrawalHash: "0xdirect1" },
      transactionHash: "0xtx1",
      blockTimestamp: "0x64",
    } as DirectWithdrawalQueueEvent,
    {
      args: { withdrawalHash: "0xdirect2" },
      transactionHash: "0xtx2",
      blockTimestamp: "0xc8",
    } as DirectWithdrawalQueueEvent,
  ];

  const mockClaimableWithdrawalEvents: ClaimableWithdrawalEvent[] = [
    {
      args: { withdrawalHash: "0xclaimable1" },
      transactionHash: "0xtx3",
      blockTimestamp: "0x12c",
    } as ClaimableWithdrawalEvent,
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockEthereumClient = {
      getBlockNumber: vi.fn().mockResolvedValue(2000000n),
    } as any;

    mockWithdrawalInstance = {
      listAllWithdrawals: vi.fn(),
      updateWithdrawalsBatch: vi.fn().mockResolvedValue(undefined),
    };

    mockWithdrawalEvent = {
      getLatestEvent: vi.fn().mockResolvedValue(null),
      addOrUpdateEvent: vi.fn().mockResolvedValue(undefined),
    };

    (Event as MockedFunction<any>).mockReturnValue(mockWithdrawalEvent);
    (Withdrawal.getInstance as MockedFunction<any>).mockReturnValue(mockWithdrawalInstance);
    (createNetworkClient as MockedFunction<any>).mockReturnValue(mockEthereumClient);
    (getStartBlockNumber as MockedFunction<any>).mockReturnValue(1000000n);
    (validateBlockRange as MockedFunction<any>).mockReturnValue(true);
    (fromHex as MockedFunction<typeof fromHex>).mockImplementation((hex: string) => {
      const mapping: { [key: string]: number } = {
        "0x64": 100,
        "0xc8": 200,
        "0x12c": 300,
      };
      return mapping[hex] || 0;
    });
  });

  describe("finalizeRelayedWithdrawals", () => {
    it("should skip processing when block range is invalid", async () => {
      (validateBlockRange as MockedFunction<any>).mockReturnValue(false);

      await finalizeRelayedWithdrawals();

      expect(logger.info).toHaveBeenCalledWith(
        "Skipping finalizeRelayedWithdrawals due to invalid block range.",
      );
      expect(mockWithdrawalInstance.listAllWithdrawals).not.toHaveBeenCalled();
      expect(fetchEvents).not.toHaveBeenCalled();
      expect(mockWithdrawalInstance.updateWithdrawalsBatch).not.toHaveBeenCalled();
      expect(mockWithdrawalEvent.addOrUpdateEvent).not.toHaveBeenCalled();
    });

    it("should successfully process withdrawals with matching events", async () => {
      // Setup mocks
      mockWithdrawalInstance.listAllWithdrawals.mockResolvedValue({
        items: [...mockDirectWithdrawals, ...mockClaimableWithdrawals],
        totalCount: 3,
      });

      (fetchEvents as MockedFunction<any>)
        .mockResolvedValueOnce(mockDirectWithdrawalEvents)
        .mockResolvedValueOnce(mockClaimableWithdrawalEvents);

      // Execute
      await finalizeRelayedWithdrawals();

      // Verify Event construction
      expect(Event).toHaveBeenCalledWith(FIRESTORE_DOCUMENT_EVENTS.WITHDRAWAL);

      // Verify network client creation
      expect(createNetworkClient).toHaveBeenCalledWith("l1");

      // Verify withdrawal instance calls
      expect(mockWithdrawalInstance.listAllWithdrawals).toHaveBeenCalledWith({
        status: "Relayed",
        orderBy: "relayedTimestamp",
      });

      // Verify event fetching
      expect(fetchEvents).toHaveBeenCalledTimes(2);
      expect(fetchEvents).toHaveBeenNthCalledWith(1, mockEthereumClient, {
        startBlockNumber: 1000000n,
        endBlockNumber: 2000000n,
        blockRange: BLOCK_RANGE_MIN,
        contractAddress: LIQUIDITY_CONTRACT_ADDRESS,
        eventInterface: directWithdrawalSuccessedEvent,
        args: {
          withdrawalHash: ["0xdirect1", "0xdirect2"],
        },
      });

      expect(fetchEvents).toHaveBeenNthCalledWith(2, mockEthereumClient, {
        startBlockNumber: 1000000n,
        endBlockNumber: 2000000n,
        blockRange: BLOCK_RANGE_MIN,
        contractAddress: LIQUIDITY_CONTRACT_ADDRESS,
        eventInterface: withdrawalClaimableEvent,
        args: {
          withdrawalHash: ["0xdirect1", "0xdirect2", "0xclaimable1"],
        },
      });

      // Verify batch updates
      expect(mockWithdrawalInstance.updateWithdrawalsBatch).toHaveBeenCalledWith([
        {
          hash: "0xdirect1",
          status: "Completed",
          liquidityTransactionHash: "0xtx1",
          liquidityTimestamp: 100,
        },
        {
          hash: "0xdirect2",
          status: "Completed",
          liquidityTransactionHash: "0xtx2",
          liquidityTimestamp: 200,
        },
        {
          hash: "0xclaimable1",
          status: "Completed",
          liquidityTransactionHash: "0xtx3",
          liquidityTimestamp: 300,
        },
      ]);

      // Verify event update
      expect(mockWithdrawalEvent.addOrUpdateEvent).toHaveBeenCalledWith({
        lastBlockNumber: 2000000,
      });

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith("Processed withdrawal batch 1 of 1");
      expect(logger.info).toHaveBeenCalledWith(
        "Completed completed withdrawals: 3 / 3 added total withdrawals",
      );
    });

    it("should handle missing events gracefully", async () => {
      mockWithdrawalInstance.listAllWithdrawals.mockResolvedValue({
        items: mockDirectWithdrawals,
        totalCount: 2,
      });

      // Return events that don't match all withdrawals
      (fetchEvents as MockedFunction<any>)
        .mockResolvedValueOnce([mockDirectWithdrawalEvents[0]]) // Only first event
        .mockResolvedValueOnce([]);

      await finalizeRelayedWithdrawals();

      // Should only update the withdrawal with matching event
      expect(mockWithdrawalInstance.updateWithdrawalsBatch).toHaveBeenCalledWith([
        {
          hash: "0xdirect1",
          status: "Completed",
          liquidityTransactionHash: "0xtx1",
          liquidityTimestamp: 100,
        },
      ]);
    });

    it("should handle case when no events are returned", async () => {
      const withdrawalWithoutEvent: RelayedWithdrawal = {
        hash: "0xnoEvent",
        type: "direct",
        status: "Relayed",
        liquidityTransactionHash: "0xtx99",
      };

      mockWithdrawalInstance.listAllWithdrawals.mockResolvedValue({
        items: [withdrawalWithoutEvent],
        totalCount: 1,
      });

      (fetchEvents as MockedFunction<any>)
        .mockResolvedValueOnce([]) // No matching events
        .mockResolvedValueOnce([]);

      await finalizeRelayedWithdrawals();

      // Since no events are returned, no withdrawals will be matched
      // and no batch processing will occur, so no error should be logged
      expect(logger.error).not.toHaveBeenCalled();
      expect(mockWithdrawalInstance.updateWithdrawalsBatch).not.toHaveBeenCalled();
    });

    it("should log error when event is missing during batch processing", async () => {
      // This test simulates the rare case where a withdrawal passes the filter
      // but the event is somehow missing from the map during batch processing
      const withdrawal: RelayedWithdrawal = {
        hash: "0xmissingEvent",
        type: "direct",
        status: "Relayed",
        liquidityTransactionHash: "0xtx99",
      };

      mockWithdrawalInstance.listAllWithdrawals.mockResolvedValue({
        items: [withdrawal],
        totalCount: 1,
      });

      const mockEvent = {
        args: { withdrawalHash: "0xmissingEvent" },
        transactionHash: "0xtx99",
        blockTimestamp: "0x64",
      } as DirectWithdrawalQueueEvent;

      (fetchEvents as MockedFunction<any>)
        .mockResolvedValueOnce([mockEvent])
        .mockResolvedValueOnce([]);

      // Mock the Map.get to return undefined even though Map.has returned true
      const originalMapGet = Map.prototype.get;
      Map.prototype.get = vi.fn().mockReturnValue(undefined);

      await finalizeRelayedWithdrawals();

      expect(logger.error).toHaveBeenCalledWith(
        "No event found for withdrawal hash: 0xmissingEvent",
      );
      expect(mockWithdrawalInstance.updateWithdrawalsBatch).toHaveBeenCalledWith([]);

      // Restore original Map.get
      Map.prototype.get = originalMapGet;
    });

    it("should process large batches correctly", async () => {
      const largeWithdrawalList = Array.from({ length: 25 }, (_, i) => ({
        hash: `0xhash${i}`,
        type: "direct" as const,
        status: "Relayed" as const,
        liquidityTransactionHash: `0xtx${i}`,
      }));

      const largeEventList = largeWithdrawalList.map((w, i) => ({
        args: { withdrawalHash: w.hash },
        transactionHash: `0xtx${i}`,
        blockTimestamp: `0x${(100 + i).toString(16)}`,
      })) as DirectWithdrawalQueueEvent[];

      mockWithdrawalInstance.listAllWithdrawals.mockResolvedValue({
        items: largeWithdrawalList,
        totalCount: 25,
      });

      (fetchEvents as MockedFunction<any>)
        .mockResolvedValueOnce(largeEventList)
        .mockResolvedValueOnce([]);

      (fromHex as MockedFunction<typeof fromHex>).mockImplementation((hex: string) => {
        return parseInt(hex, 16);
      });

      await finalizeRelayedWithdrawals();

      // Should be called 3 times (25 items / 10 batch size = 3 batches)
      expect(mockWithdrawalInstance.updateWithdrawalsBatch).toHaveBeenCalledTimes(3);

      // Verify batch logging
      expect(logger.info).toHaveBeenCalledWith("Processed withdrawal batch 1 of 3");
      expect(logger.info).toHaveBeenCalledWith("Processed withdrawal batch 2 of 3");
      expect(logger.info).toHaveBeenCalledWith("Processed withdrawal batch 3 of 3");
    });

    it("should handle empty withdrawal list", async () => {
      mockWithdrawalInstance.listAllWithdrawals.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      (fetchEvents as MockedFunction<any>).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await finalizeRelayedWithdrawals();

      expect(mockWithdrawalInstance.updateWithdrawalsBatch).not.toHaveBeenCalled();
      expect(mockWithdrawalEvent.addOrUpdateEvent).toHaveBeenCalledWith({
        lastBlockNumber: 2000000,
      });
    });

    it("should handle validateBlockRange check", async () => {
      mockWithdrawalInstance.listAllWithdrawals.mockResolvedValue({
        items: [...mockDirectWithdrawals, ...mockClaimableWithdrawals],
        totalCount: 3,
      });

      (fetchEvents as MockedFunction<any>).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await finalizeRelayedWithdrawals();

      expect(validateBlockRange).toHaveBeenCalledWith(
        "finalizeRelayedWithdrawals",
        1000000n,
        2000000n,
      );
    });

    it("should use last processed event block number when available", async () => {
      const lastProcessedEvent: EventData = {
        id: "lastEvent",
        lastBlockNumber: 1500000,
      };

      mockWithdrawalEvent.getLatestEvent.mockResolvedValue(lastProcessedEvent);
      (getStartBlockNumber as MockedFunction<any>).mockReturnValue(1500000n);

      mockWithdrawalInstance.listAllWithdrawals.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      (fetchEvents as MockedFunction<any>).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await finalizeRelayedWithdrawals();

      expect(getStartBlockNumber).toHaveBeenCalledWith(
        lastProcessedEvent,
        LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
      );
    });
  });
});
