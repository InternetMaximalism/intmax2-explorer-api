import type { QueryValidationType } from "@intmax2-explorer-api/shared";
import { beforeEach, describe, expect, it, type MockedFunction, vi } from "vitest";
import { getBlock, getBlockByBlockNumber } from "./blocks.service";
import { getDeposit } from "./deposits.service";
import { getSearch } from "./search.service";
import { getWithdrawal } from "./withdrawals.service";

vi.mock("./blocks.service", () => ({
  getBlock: vi.fn(),
  getBlockByBlockNumber: vi.fn(),
}));

vi.mock("./deposits.service", () => ({
  getDeposit: vi.fn(),
}));

vi.mock("./withdrawals.service", () => ({
  getWithdrawal: vi.fn(),
}));

describe("search.service", () => {
  const mockBlock = {
    hash: "0xblock123",
    blockNumber: 100,
    blockType: "proving",
    status: "Finalized",
    transactionCount: 5,
  };

  const mockDeposit = {
    hash: "0xdeposit123",
    amount: "1000000000000000000",
    tokenAddress: "0xtoken123",
    status: "Completed",
  };

  const mockWithdrawal = {
    hash: "0xwithdrawal123",
    amount: "500000000000000000",
    tokenAddress: "0xtoken456",
    status: "Completed",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSearch", () => {
    describe("when query is a number (block number search)", () => {
      it("should return block when block exists for the given block number", async () => {
        const query: QueryValidationType = { query: 100 };
        (getBlockByBlockNumber as MockedFunction<any>).mockResolvedValue(mockBlock);

        const result = await getSearch(query);

        expect(getBlockByBlockNumber).toHaveBeenCalledWith(100);
        expect(result).toEqual({
          type: "block",
          item: mockBlock,
        });
      });

      it("should return not_found when no block exists for the given block number", async () => {
        const query: QueryValidationType = { query: 999 };
        (getBlockByBlockNumber as MockedFunction<any>).mockResolvedValue(null);

        const result = await getSearch(query);

        expect(getBlockByBlockNumber).toHaveBeenCalledWith(999);
        expect(result).toEqual({
          type: "not_found",
          item: null,
        });
      });

      it("should not call other services when searching by block number", async () => {
        const query: QueryValidationType = { query: 100 };
        (getBlockByBlockNumber as MockedFunction<any>).mockResolvedValue(mockBlock);

        await getSearch(query);

        expect(getBlock).not.toHaveBeenCalled();
        expect(getDeposit).not.toHaveBeenCalled();
        expect(getWithdrawal).not.toHaveBeenCalled();
      });
    });

    describe("when query is a string (hash search)", () => {
      it("should return block when block hash is found", async () => {
        const query: QueryValidationType = { query: "0xblock123" };
        (getBlock as MockedFunction<any>).mockResolvedValue(mockBlock);
        (getDeposit as MockedFunction<any>).mockRejectedValue(new Error("Not found"));
        (getWithdrawal as MockedFunction<any>).mockRejectedValue(new Error("Not found"));

        const result = await getSearch(query);

        expect(getBlock).toHaveBeenCalledWith({ hash: "0xblock123" });
        expect(getDeposit).toHaveBeenCalledWith({ hash: "0xblock123" });
        expect(getWithdrawal).toHaveBeenCalledWith({ hash: "0xblock123" });
        expect(result).toEqual({
          type: "block",
          item: mockBlock,
        });
      });

      it("should return deposit when deposit hash is found and block is not found", async () => {
        const query: QueryValidationType = { query: "0xdeposit123" };
        (getBlock as MockedFunction<any>).mockRejectedValue(new Error("Not found"));
        (getDeposit as MockedFunction<any>).mockResolvedValue(mockDeposit);
        (getWithdrawal as MockedFunction<any>).mockRejectedValue(new Error("Not found"));

        const result = await getSearch(query);

        expect(getBlock).toHaveBeenCalledWith({ hash: "0xdeposit123" });
        expect(getDeposit).toHaveBeenCalledWith({ hash: "0xdeposit123" });
        expect(getWithdrawal).toHaveBeenCalledWith({ hash: "0xdeposit123" });
        expect(result).toEqual({
          type: "deposit",
          item: mockDeposit,
        });
      });

      it("should return withdrawal when withdrawal hash is found and block/deposit are not found", async () => {
        const query: QueryValidationType = { query: "0xwithdrawal123" };
        (getBlock as MockedFunction<any>).mockRejectedValue(new Error("Not found"));
        (getDeposit as MockedFunction<any>).mockRejectedValue(new Error("Not found"));
        (getWithdrawal as MockedFunction<any>).mockResolvedValue(mockWithdrawal);

        const result = await getSearch(query);

        expect(getBlock).toHaveBeenCalledWith({ hash: "0xwithdrawal123" });
        expect(getDeposit).toHaveBeenCalledWith({ hash: "0xwithdrawal123" });
        expect(getWithdrawal).toHaveBeenCalledWith({ hash: "0xwithdrawal123" });
        expect(result).toEqual({
          type: "withdrawal",
          item: mockWithdrawal,
        });
      });

      it("should return not_found when no hash matches are found", async () => {
        const query: QueryValidationType = { query: "0xnotfound123" };
        (getBlock as MockedFunction<any>).mockRejectedValue(new Error("Not found"));
        (getDeposit as MockedFunction<any>).mockRejectedValue(new Error("Not found"));
        (getWithdrawal as MockedFunction<any>).mockRejectedValue(new Error("Not found"));

        const result = await getSearch(query);

        expect(getBlock).toHaveBeenCalledWith({ hash: "0xnotfound123" });
        expect(getDeposit).toHaveBeenCalledWith({ hash: "0xnotfound123" });
        expect(getWithdrawal).toHaveBeenCalledWith({ hash: "0xnotfound123" });
        expect(result).toEqual({
          type: "not_found",
          item: null,
        });
      });

      it("should prioritize block over deposit and withdrawal when multiple matches exist", async () => {
        const query: QueryValidationType = { query: "0xmultiple123" };
        (getBlock as MockedFunction<any>).mockResolvedValue(mockBlock);
        (getDeposit as MockedFunction<any>).mockResolvedValue(mockDeposit);
        (getWithdrawal as MockedFunction<any>).mockResolvedValue(mockWithdrawal);

        const result = await getSearch(query);

        expect(result).toEqual({
          type: "block",
          item: mockBlock,
        });
      });

      it("should prioritize deposit over withdrawal when block is not found but both deposit and withdrawal exist", async () => {
        const query: QueryValidationType = { query: "0xmultiple456" };
        (getBlock as MockedFunction<any>).mockRejectedValue(new Error("Not found"));
        (getDeposit as MockedFunction<any>).mockResolvedValue(mockDeposit);
        (getWithdrawal as MockedFunction<any>).mockResolvedValue(mockWithdrawal);

        const result = await getSearch(query);

        expect(result).toEqual({
          type: "deposit",
          item: mockDeposit,
        });
      });

      it("should handle null responses from services", async () => {
        const query: QueryValidationType = { query: "0xnull123" };
        (getBlock as MockedFunction<any>).mockResolvedValue(null);
        (getDeposit as MockedFunction<any>).mockResolvedValue(null);
        (getWithdrawal as MockedFunction<any>).mockResolvedValue(null);

        const result = await getSearch(query);

        expect(result).toEqual({
          type: "not_found",
          item: null,
        });
      });

      it("should handle undefined responses from services", async () => {
        const query: QueryValidationType = { query: "0xundefined123" };
        (getBlock as MockedFunction<any>).mockResolvedValue(undefined);
        (getDeposit as MockedFunction<any>).mockResolvedValue(undefined);
        (getWithdrawal as MockedFunction<any>).mockResolvedValue(undefined);

        const result = await getSearch(query);

        expect(result).toEqual({
          type: "not_found",
          item: null,
        });
      });

      it("should execute all service calls in parallel", async () => {
        const query: QueryValidationType = { query: "0xparallel123" };
        let blockCallTime: number;
        let depositCallTime: number;
        let withdrawalCallTime: number;
        const startTime = Date.now();

        (getBlock as MockedFunction<any>).mockImplementation(async () => {
          blockCallTime = Date.now() - startTime;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return null;
        });

        (getDeposit as MockedFunction<any>).mockImplementation(async () => {
          depositCallTime = Date.now() - startTime;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return null;
        });

        (getWithdrawal as MockedFunction<any>).mockImplementation(async () => {
          withdrawalCallTime = Date.now() - startTime;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return null;
        });

        await getSearch(query);

        // All calls should start at approximately the same time (within 10ms)
        expect(Math.abs(blockCallTime! - depositCallTime!)).toBeLessThan(10);
        expect(Math.abs(blockCallTime! - withdrawalCallTime!)).toBeLessThan(10);
        expect(Math.abs(depositCallTime! - withdrawalCallTime!)).toBeLessThan(10);
      });

      it("should handle mixed success and error responses", async () => {
        const query: QueryValidationType = { query: "0xmixed123" };
        (getBlock as MockedFunction<any>).mockRejectedValue(new Error("Block service error"));
        (getDeposit as MockedFunction<any>).mockResolvedValue(mockDeposit);
        (getWithdrawal as MockedFunction<any>).mockRejectedValue(
          new Error("Withdrawal service error"),
        );

        const result = await getSearch(query);

        expect(result).toEqual({
          type: "deposit",
          item: mockDeposit,
        });
      });
    });

    describe("edge cases", () => {
      it("should handle empty string query", async () => {
        const query: QueryValidationType = { query: "" };
        (getBlock as MockedFunction<any>).mockRejectedValue(new Error("Not found"));
        (getDeposit as MockedFunction<any>).mockRejectedValue(new Error("Not found"));
        (getWithdrawal as MockedFunction<any>).mockRejectedValue(new Error("Not found"));

        const result = await getSearch(query);

        expect(getBlock).toHaveBeenCalledWith({ hash: "" });
        expect(result).toEqual({
          type: "not_found",
          item: null,
        });
      });

      it("should handle zero as block number", async () => {
        const query: QueryValidationType = { query: 0 };
        (getBlockByBlockNumber as MockedFunction<any>).mockResolvedValue(mockBlock);

        const result = await getSearch(query);

        expect(getBlockByBlockNumber).toHaveBeenCalledWith(0);
        expect(result).toEqual({
          type: "block",
          item: mockBlock,
        });
      });

      it("should handle negative block number", async () => {
        const query: QueryValidationType = { query: -1 };
        (getBlockByBlockNumber as MockedFunction<any>).mockResolvedValue(null);

        const result = await getSearch(query);

        expect(getBlockByBlockNumber).toHaveBeenCalledWith(-1);
        expect(result).toEqual({
          type: "not_found",
          item: null,
        });
      });

      it("should handle very large block number", async () => {
        const query: QueryValidationType = { query: Number.MAX_SAFE_INTEGER };
        (getBlockByBlockNumber as MockedFunction<any>).mockResolvedValue(null);

        const result = await getSearch(query);

        expect(getBlockByBlockNumber).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
        expect(result).toEqual({
          type: "not_found",
          item: null,
        });
      });

      it("should handle long hash string", async () => {
        const longHash = "0x" + "a".repeat(64);
        const query: QueryValidationType = { query: longHash };
        (getBlock as MockedFunction<any>).mockRejectedValue(new Error("Not found"));
        (getDeposit as MockedFunction<any>).mockRejectedValue(new Error("Not found"));
        (getWithdrawal as MockedFunction<any>).mockRejectedValue(new Error("Not found"));

        const result = await getSearch(query);

        expect(getBlock).toHaveBeenCalledWith({ hash: longHash });
        expect(result).toEqual({
          type: "not_found",
          item: null,
        });
      });
    });
  });
});
