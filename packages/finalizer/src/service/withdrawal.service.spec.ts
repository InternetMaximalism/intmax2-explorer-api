import {
  BLOCK_RANGE_MINIMUM,
  type ClaimableWithdrawalEvent,
  type DirectWithdrawalQueueEvent,
  Event,
  type EventData,
  LIQUIDITY_CONTRACT_ADDRESS,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  Withdrawal,
  directWithdrawalSuccessedEvent,
  fetchEvents,
  getStartBlockNumber,
  logger,
  validateBlockRange,
  withdrawalClaimableEvent,
} from "@intmax2-explorer-api/shared";
import { type PublicClient, fromHex } from "viem";
import { type MockedFunction, beforeEach, describe, expect, it, vi } from "vitest";
import type { FinalizeRelayedWithdrawalsParams, RelayedWithdrawal } from "../types";
import { finalizeRelayedWithdrawals } from "./withdrawal.service";

vi.mock("@intmax2-explorer-api/shared", () => ({
  BLOCK_RANGE_MINIMUM: 1000,
  LIQUIDITY_CONTRACT_ADDRESS: "0x123",
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK: 1000000n,
  WITHDRAWAL_BATCH_SIZE: 10,
  Withdrawal: {
    getInstance: vi.fn(),
  },
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

    mockEthereumClient = {} as PublicClient;

    mockWithdrawalInstance = {
      listAllWithdrawals: vi.fn(),
      updateWithdrawalsBatch: vi.fn().mockResolvedValue(undefined),
    };

    mockWithdrawalEvent = {
      addOrUpdateEvent: vi.fn().mockResolvedValue(undefined),
    };

    (Withdrawal.getInstance as MockedFunction<any>).mockReturnValue(mockWithdrawalInstance);
    (getStartBlockNumber as MockedFunction<any>).mockReturnValue(1000000n);
    // biome-ignore lint/suspicious/noEmptyBlockStatements: <explanation>
    (validateBlockRange as MockedFunction<any>).mockImplementation(() => {});
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
    let defaultParams: FinalizeRelayedWithdrawalsParams;

    beforeEach(() => {
      defaultParams = {
        ethereumClient: mockEthereumClient,
        currentBlockNumber: 2000000n,
        withdrawalEvent: mockWithdrawalEvent as unknown as Event,
        lastWithdrawalProcessedEvent: null,
      };
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
      await finalizeRelayedWithdrawals(defaultParams);

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
        blockRange: BLOCK_RANGE_MINIMUM,
        contractAddress: LIQUIDITY_CONTRACT_ADDRESS,
        eventInterface: directWithdrawalSuccessedEvent,
        args: {
          withdrawalHash: ["0xdirect1", "0xdirect2"],
        },
      });

      expect(fetchEvents).toHaveBeenNthCalledWith(2, mockEthereumClient, {
        startBlockNumber: 1000000n,
        endBlockNumber: 2000000n,
        blockRange: BLOCK_RANGE_MINIMUM,
        contractAddress: LIQUIDITY_CONTRACT_ADDRESS,
        eventInterface: withdrawalClaimableEvent,
        args: {
          withdrawalHash: ["0xclaimable1"],
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

      await finalizeRelayedWithdrawals(defaultParams);

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

    it("should process large batches correctly", async () => {
      const largeWithdrawalList = Array.from({ length: 25 }, (_, i) => ({
        hash: `0xhash${i}`,
        type: "direct" as const,
        status: "Relayed" as const,
        relayedTimestamp: 1000 + i,
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

      await finalizeRelayedWithdrawals(defaultParams);

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

      await finalizeRelayedWithdrawals(defaultParams);

      expect(mockWithdrawalInstance.updateWithdrawalsBatch).not.toHaveBeenCalled();
      expect(mockWithdrawalEvent.addOrUpdateEvent).toHaveBeenCalledWith({
        lastBlockNumber: 2000000,
      });
    });

    it("should validate block range for both event types", async () => {
      mockWithdrawalInstance.listAllWithdrawals.mockResolvedValue({
        items: [...mockDirectWithdrawals, ...mockClaimableWithdrawals],
        totalCount: 3,
      });

      (fetchEvents as MockedFunction<any>).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await finalizeRelayedWithdrawals(defaultParams);

      expect(validateBlockRange).toHaveBeenCalledWith(
        "DirectWithdrawalSuccessed",
        1000000n,
        2000000n,
      );
      expect(validateBlockRange).toHaveBeenCalledWith("WithdrawalClaimable", 1000000n, 2000000n);
    });

    it("should use last processed event block number when available", async () => {
      const lastProcessedEvent: EventData = {
        id: "lastEvent",
        lastBlockNumber: 1500000,
      };

      const paramsWithLastEvent = {
        ...defaultParams,
        lastWithdrawalProcessedEvent: lastProcessedEvent,
      };

      (getStartBlockNumber as MockedFunction<any>).mockReturnValue(1500000n);

      mockWithdrawalInstance.listAllWithdrawals.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      (fetchEvents as MockedFunction<any>).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await finalizeRelayedWithdrawals(paramsWithLastEvent);

      expect(getStartBlockNumber).toHaveBeenCalledWith(
        lastProcessedEvent,
        LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
      );
    });
  });
});
