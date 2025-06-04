import type { Transaction } from "@google-cloud/firestore";
import {
  Block,
  type BlockData,
  BlockStatus,
  BlockType,
  BlockValidity,
  FIRESTORE_DOCUMENT_STATS,
  InternalBlockType,
  Stats,
  calculateNextAccountId,
  calculateTotalTransactions,
  config,
  db,
  fetchLatestValidityProofBlockNumber,
  fetchValidityPis,
  getBlockStatusFromValidityProof,
  getBlockValidity,
  getProvingBlockStatus,
  logger,
  sleep,
} from "@intmax2-explorer-api/shared";
import { type MockedFunction, beforeEach, describe, expect, it, vi } from "vitest";
import { finalizePendingBlocks } from "./block.service";

vi.mock("@intmax2-explorer-api/shared", () => ({
  BLOCK_BATCH_SIZE_LARGE: 50,
  Block: {
    getInstance: vi.fn(),
  },
  FIRESTORE_DOCUMENT_STATS: {
    summary: "stats-summary",
  },
  Stats: vi.fn(),
  calculateNextAccountId: vi.fn(),
  calculateTotalTransactions: vi.fn(),
  config: {
    VALIDITY_PROVER_API_BLOCK_BATCH_SIZE: 10,
    VALIDITY_PROVER_API_SLEEP_TIME: 100,
  },
  db: {
    runTransaction: vi.fn(),
  },
  fetchLatestValidityProofBlockNumber: vi.fn(),
  fetchValidityPis: vi.fn(),
  getBlockStatusFromValidityProof: vi.fn(),
  getBlockValidity: vi.fn(),
  getProvingBlockStatus: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  sleep: vi.fn(),
}));

describe("block.service", () => {
  let mockBlockInstance: {
    listBlocks: MockedFunction<any>;
    listAllBlocks: MockedFunction<any>;
    updateBlocksBatch: MockedFunction<any>;
  };
  let mockStatsInstance: {
    getLatestStatsWithTransaction: MockedFunction<any>;
    addOrUpdateStatsWithTransaction: MockedFunction<any>;
  };
  let mockTransaction: Transaction;

  const mockIndexingBlocks: BlockData[] = [
    {
      hash: "0xindexing1",
      blockNumber: 100,
      blockType: "proving" as unknown as BlockType,
      transactionCount: 5,
      internalBlockType: "deposit" as unknown as InternalBlockType,
      status: "Indexing" as unknown as BlockStatus,
      nextAccountId: 10,
      blockValidity: null as unknown as BlockValidity,
      builderAddress: "0xbuilder1",
      timestamp: 1234567890,
      rollupTransactionHash: "0xrollup1",
      transactionDigest: "0xdigest1",
      blockAggregatorSignature: ["0xsignature1"],
    },
    {
      hash: "0xindexing2",
      blockNumber: 101,
      blockType: "proving" as unknown as BlockType,
      transactionCount: 3,
      internalBlockType: "withdrawal" as unknown as InternalBlockType,
      status: "Indexing" as unknown as BlockStatus,
      nextAccountId: 11,
      blockValidity: null as unknown as BlockValidity,
      builderAddress: "0xbuilder2",
      timestamp: 1234567891,
      rollupTransactionHash: "0xrollup2",
      transactionDigest: "0xdigest2",
      blockAggregatorSignature: ["0xsignature2"],
    },
  ];

  const mockProvingBlocks: BlockData[] = [
    {
      hash: "0xproving1",
      blockNumber: 200,
      blockType: "proving" as unknown as BlockType,
      transactionCount: 7,
      internalBlockType: "normal" as unknown as InternalBlockType,
      status: "Proving" as unknown as BlockStatus,
      nextAccountId: 20,
      blockValidity: "valid" as unknown as BlockValidity,
      builderAddress: "0xbuilder3",
      timestamp: 1234567892,
      rollupTransactionHash: "0xrollup3",
      transactionDigest: "0xdigest3",
      blockAggregatorSignature: ["0xsignature3"],
    },
    {
      hash: "0xproving2",
      blockNumber: 201,
      blockType: "proving" as unknown as BlockType,
      transactionCount: 2,
      internalBlockType: "normal" as unknown as InternalBlockType,
      status: "Proving" as unknown as BlockStatus,
      nextAccountId: 21,
      blockValidity: "valid" as unknown as BlockValidity,
      builderAddress: "0xbuilder4",
      timestamp: 1234567893,
      rollupTransactionHash: "0xrollup4",
      transactionDigest: "0xdigest4",
      blockAggregatorSignature: ["0xsignature4"],
    },
  ];

  const mockValidityProof = {
    publicState: {
      nextAccountId: 15,
    },
    isValid: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockBlockInstance = {
      listBlocks: vi.fn(),
      listAllBlocks: vi.fn(),
      updateBlocksBatch: vi.fn().mockResolvedValue(undefined),
    };

    mockStatsInstance = {
      getLatestStatsWithTransaction: vi.fn(),
      addOrUpdateStatsWithTransaction: vi.fn().mockResolvedValue(undefined),
    };

    mockTransaction = {} as Transaction;

    (Block.getInstance as MockedFunction<any>).mockReturnValue(mockBlockInstance);
    (Stats as unknown as MockedFunction<any>).mockReturnValue(mockStatsInstance);
    (fetchLatestValidityProofBlockNumber as MockedFunction<any>).mockResolvedValue({
      blockNumber: 500,
    });
    (fetchValidityPis as MockedFunction<any>).mockResolvedValue(mockValidityProof);
    (getBlockValidity as MockedFunction<any>).mockReturnValue("valid");
    (getBlockStatusFromValidityProof as MockedFunction<any>).mockReturnValue("Finalized");
    (getProvingBlockStatus as MockedFunction<any>).mockReturnValue("Finalized");
    (calculateTotalTransactions as MockedFunction<any>).mockReturnValue(8);
    (calculateNextAccountId as MockedFunction<any>).mockReturnValue(25);
    (sleep as MockedFunction<any>).mockResolvedValue(undefined);
    (db.runTransaction as MockedFunction<typeof db.runTransaction>).mockImplementation((callback) =>
      callback(mockTransaction),
    );
  });

  describe("finalizePendingBlocks", () => {
    it("should successfully process blocks and update stats", async () => {
      // Setup mocks
      mockBlockInstance.listBlocks.mockResolvedValue({
        items: mockIndexingBlocks,
        totalCount: 2,
      });
      mockBlockInstance.listAllBlocks.mockResolvedValue({
        items: mockProvingBlocks,
        totalCount: 2,
      });

      mockStatsInstance.getLatestStatsWithTransaction.mockResolvedValue({
        totalTransactionCount: 100,
        totalL2WalletCount: 50,
      });

      // Execute
      await finalizePendingBlocks();

      // Verify block fetching
      expect(mockBlockInstance.listBlocks).toHaveBeenCalledWith({
        status: "Indexing",
        perPage: config.VALIDITY_PROVER_API_BLOCK_BATCH_SIZE,
        orderDirection: "asc",
      });
      expect(mockBlockInstance.listAllBlocks).toHaveBeenCalledWith({ status: "Proving" });
      expect(fetchLatestValidityProofBlockNumber).toHaveBeenCalled();

      // Verify indexing blocks processing
      expect(fetchValidityPis).toHaveBeenCalledTimes(2);
      expect(fetchValidityPis).toHaveBeenCalledWith(100);
      expect(fetchValidityPis).toHaveBeenCalledWith(101);

      expect(getBlockValidity).toHaveBeenCalledTimes(2);
      expect(getBlockStatusFromValidityProof).toHaveBeenCalledTimes(2);

      // Verify proving blocks processing
      expect(getProvingBlockStatus).toHaveBeenCalledTimes(2);
      expect(getProvingBlockStatus).toHaveBeenCalledWith(200, 500);
      expect(getProvingBlockStatus).toHaveBeenCalledWith(201, 500);

      // Verify batch update
      expect(mockBlockInstance.updateBlocksBatch).toHaveBeenCalledWith([
        {
          hash: "0xindexing1",
          status: "Finalized",
          blockValidity: "valid",
          nextAccountId: 15,
          transactionCount: 5,
          internalBlockType: "deposit",
        },
        {
          hash: "0xindexing2",
          status: "Finalized",
          blockValidity: "valid",
          nextAccountId: 15,
          transactionCount: 3,
          internalBlockType: "withdrawal",
        },
        {
          hash: "0xproving1",
          status: "Finalized",
          blockValidity: "valid",
          nextAccountId: 20,
          transactionCount: 7,
          internalBlockType: "normal",
        },
        {
          hash: "0xproving2",
          status: "Finalized",
          blockValidity: "valid",
          nextAccountId: 21,
          transactionCount: 2,
          internalBlockType: "normal",
        },
      ]);

      // Verify stats processing
      expect(db.runTransaction).toHaveBeenCalled();
      expect(calculateTotalTransactions).toHaveBeenCalled();
      expect(calculateNextAccountId).toHaveBeenCalled();
      expect(mockStatsInstance.addOrUpdateStatsWithTransaction).toHaveBeenCalledWith(
        mockTransaction,
        {
          totalTransactionCount: 108, // 100 + 8
          totalL2WalletCount: 50, // Math.max(25, 50)
        },
      );

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith("Processed block batch 1 of 1");
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("finalizePendingBlocks completed successfully"),
      );
    });

    it("should skip processing when no finalized blocks are available", async () => {
      // Setup mocks to return blocks that are still processing
      mockBlockInstance.listBlocks.mockResolvedValue({
        items: mockIndexingBlocks,
        totalCount: 2,
      });
      mockBlockInstance.listAllBlocks.mockResolvedValue({
        items: mockProvingBlocks,
        totalCount: 2,
      });

      // Mock blocks to remain in processing state
      (getBlockStatusFromValidityProof as MockedFunction<any>).mockReturnValue("Indexing");
      (getProvingBlockStatus as MockedFunction<any>).mockReturnValue("Proving");

      await finalizePendingBlocks();

      // Should not update blocks or stats
      expect(mockBlockInstance.updateBlocksBatch).not.toHaveBeenCalled();
      expect(db.runTransaction).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("No finalized blocks to process.");
    });

    it("should handle large batch processing correctly", async () => {
      // Create a large number of blocks
      const largeBlockList = Array.from({ length: 75 }, (_, i) => ({
        hash: `0xblock${i}`,
        blockNumber: i + 1,
        blockType: "proving" as const,
        transactionCount: 1,
        internalBlockType: "normal" as const,
        status: "Indexing" as const,
        nextAccountId: i + 1,
        blockValidity: null,
      }));

      mockBlockInstance.listBlocks.mockResolvedValue({
        items: largeBlockList,
        totalCount: 75,
      });
      mockBlockInstance.listAllBlocks.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      mockStatsInstance.getLatestStatsWithTransaction.mockResolvedValue({
        totalTransactionCount: 100,
        totalL2WalletCount: 50,
      });

      await finalizePendingBlocks();

      // Should be called 2 times (75 blocks / 50 batch size = 2 batches)
      expect(mockBlockInstance.updateBlocksBatch).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith("Processed block batch 1 of 2");
      expect(logger.info).toHaveBeenCalledWith("Processed block batch 2 of 2");
    });

    it("should handle indexing blocks in batches with sleep", async () => {
      const largeIndexingBlocks = Array.from({ length: 25 }, (_, i) => ({
        hash: `0xindexing${i}`,
        blockNumber: i + 1,
        blockType: "proving" as const,
        transactionCount: 1,
        internalBlockType: "normal" as const,
        status: "Indexing" as const,
        nextAccountId: i + 1,
        blockValidity: null,
      }));

      mockBlockInstance.listBlocks.mockResolvedValue({
        items: largeIndexingBlocks,
        totalCount: 25,
      });
      mockBlockInstance.listAllBlocks.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      mockStatsInstance.getLatestStatsWithTransaction.mockResolvedValue({
        totalTransactionCount: 100,
        totalL2WalletCount: 50,
      });

      await finalizePendingBlocks();

      // Should sleep between batches (25 blocks / 10 batch size = 3 batches, so 2 sleeps)
      expect(sleep).toHaveBeenCalledTimes(3);
      expect(sleep).toHaveBeenCalledWith(config.VALIDITY_PROVER_API_SLEEP_TIME);

      // Should process validity proofs for all blocks
      expect(fetchValidityPis).toHaveBeenCalledTimes(25);
    });

    it("should create new stats when no current stats exist", async () => {
      mockBlockInstance.listBlocks.mockResolvedValue({
        items: mockIndexingBlocks,
        totalCount: 2,
      });
      mockBlockInstance.listAllBlocks.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      // No existing stats
      mockStatsInstance.getLatestStatsWithTransaction.mockResolvedValue(null);

      await finalizePendingBlocks();

      expect(mockStatsInstance.addOrUpdateStatsWithTransaction).toHaveBeenCalledWith(
        mockTransaction,
        {
          totalTransactionCount: 8, // new transactions only
          totalL2WalletCount: 25, // calculated max
        },
      );
    });

    it("should filter out blocks that are still processing", async () => {
      mockBlockInstance.listBlocks.mockResolvedValue({
        items: mockIndexingBlocks,
        totalCount: 2,
      });
      mockBlockInstance.listAllBlocks.mockResolvedValue({
        items: mockProvingBlocks,
        totalCount: 2,
      });

      (getBlockStatusFromValidityProof as MockedFunction<any>)
        .mockReturnValueOnce("Indexing")
        .mockReturnValueOnce("Finalized");

      (getProvingBlockStatus as MockedFunction<any>)
        .mockReturnValueOnce("Finalized")
        .mockReturnValueOnce("Proving");

      mockStatsInstance.getLatestStatsWithTransaction.mockResolvedValue({
        totalTransactionCount: 100,
        totalL2WalletCount: 50,
      });

      await finalizePendingBlocks();

      expect(mockBlockInstance.updateBlocksBatch).toHaveBeenCalledWith([
        {
          hash: "0xindexing2", // Second indexing block
          status: "Finalized",
          blockValidity: "valid",
          nextAccountId: 15,
          transactionCount: 3,
          internalBlockType: "withdrawal",
        },
        {
          hash: "0xproving1", // First proving block
          status: "Finalized",
          blockValidity: "valid",
          nextAccountId: 20,
          transactionCount: 7,
          internalBlockType: "normal",
        },
      ]);
    });

    it("should handle empty block lists", async () => {
      mockBlockInstance.listBlocks.mockResolvedValue({
        items: [],
        totalCount: 0,
      });
      mockBlockInstance.listAllBlocks.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      await finalizePendingBlocks();

      expect(mockBlockInstance.updateBlocksBatch).not.toHaveBeenCalled();
      expect(db.runTransaction).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("No finalized blocks to process.");
    });

    it("should handle errors in validity proof fetching gracefully", async () => {
      mockBlockInstance.listBlocks.mockResolvedValue({
        items: [mockIndexingBlocks[0]],
        totalCount: 1,
      });
      mockBlockInstance.listAllBlocks.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      (fetchValidityPis as MockedFunction<any>).mockRejectedValue(
        new Error("Validity proof fetch failed"),
      );

      await expect(finalizePendingBlocks()).rejects.toThrow("Validity proof fetch failed");
    });

    it("should use correct stats document reference", async () => {
      mockBlockInstance.listBlocks.mockResolvedValue({
        items: mockIndexingBlocks,
        totalCount: 2,
      });
      mockBlockInstance.listAllBlocks.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      mockStatsInstance.getLatestStatsWithTransaction.mockResolvedValue({
        totalTransactionCount: 100,
        totalL2WalletCount: 50,
      });

      await finalizePendingBlocks();

      expect(Stats).toHaveBeenCalledWith(FIRESTORE_DOCUMENT_STATS.summary);
    });
  });
});
