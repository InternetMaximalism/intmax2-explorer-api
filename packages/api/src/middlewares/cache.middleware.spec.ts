import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from "vitest";
import type { Context, Next } from "hono";
import { cacheMiddleware } from "./cache.middleware";
import { MemoryCacheStore } from "../lib/cacheStore";

vi.mock("../lib/cacheStore", () => ({
  MemoryCacheStore: {
    getInstance: vi.fn(),
  },
}));

describe("cache.middleware", () => {
  let mockCacheStore: {
    get: MockedFunction<any>;
    set: MockedFunction<any>;
  };
  let mockContext: Context;
  let mockNext: Next;
  let mockResponse: Response;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCacheStore = {
      get: vi.fn(),
      set: vi.fn(),
    };

    mockResponse = new Response(JSON.stringify({ data: "test" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    mockContext = {
      req: {
        path: "/api/v1/blocks",
        query: vi.fn().mockReturnValue({
          perPage: "10",
          cursor: "abc123",
          blockType: "proving",
        }),
      },
      res: {
        clone: vi.fn().mockReturnValue(mockResponse),
      },
    } as unknown as Context;

    mockNext = vi.fn().mockResolvedValue(undefined);

    (MemoryCacheStore.getInstance as MockedFunction<any>).mockReturnValue(mockCacheStore);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("cacheMiddleware", () => {
    it("should return cached response when cache hit occurs", async () => {
      const cachedResponse = new Response(JSON.stringify({ cached: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

      mockCacheStore.get.mockReturnValue(cachedResponse);

      const result = await cacheMiddleware(mockContext, mockNext, 5000);

      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/blocks-blockType=proving-cursor=abc123-perPage=10",
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(result).toBe(cachedResponse);
      expect(mockCacheStore.set).not.toHaveBeenCalled();
    });

    it("should execute next and cache response when cache miss occurs", async () => {
      mockCacheStore.get.mockReturnValue(undefined);

      const result = await cacheMiddleware(mockContext, mockNext, 5000);

      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/blocks-blockType=proving-cursor=abc123-perPage=10",
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockCacheStore.set).toHaveBeenCalledWith(
        "/api/v1/blocks-blockType=proving-cursor=abc123-perPage=10",
        mockResponse,
        5000,
      );
      expect(result).toBe(mockResponse);
    });

    it("should generate correct cache key with valid query parameters", async () => {
      mockContext.req.query = vi.fn().mockReturnValue({
        perPage: "20",
        cursor: "xyz789",
        query: "search-term",
        blockType: "deposit",
        blockValidity: "valid",
        tokenType: "ETH",
        status: "completed",
        invalidParam: "should-be-ignored", // This should be filtered out
      });

      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 3000);

      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/blocks-blockType=deposit-blockValidity=valid-cursor=xyz789-perPage=20-query=search-term-status=completed-tokenType=ETH",
      );
    });

    it("should handle empty query parameters", async () => {
      mockContext.req.query = vi.fn().mockReturnValue({});

      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockCacheStore.get).toHaveBeenCalledWith("/api/v1/blocks-");
      expect(mockCacheStore.set).toHaveBeenCalledWith("/api/v1/blocks-", mockResponse, 1000);
    });

    it("should filter out invalid query parameters", async () => {
      mockContext.req.query = vi.fn().mockReturnValue({
        perPage: "10",
        invalidParam1: "value1",
        cursor: "abc123",
        invalidParam2: "value2",
        blockType: "proving",
        invalidParam3: "value3",
      });

      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 2000);

      // Should only include valid parameters
      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/blocks-blockType=proving-cursor=abc123-perPage=10",
      );
    });

    it("should sort query parameters alphabetically in cache key", async () => {
      mockContext.req.query = vi.fn().mockReturnValue({
        status: "completed",
        perPage: "10",
        blockType: "proving",
        cursor: "abc123",
        query: "search",
      });

      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 2000);

      // Parameters should be sorted alphabetically
      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/blocks-blockType=proving-cursor=abc123-perPage=10-query=search-status=completed",
      );
    });

    it("should handle different paths correctly", async () => {
      mockContext.req.path = "/api/v1/transactions";
      mockContext.req.query = vi.fn().mockReturnValue({
        perPage: "15",
        status: "pending",
      });

      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 4000);

      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/transactions-perPage=15-status=pending",
      );
    });

    it("should use different expiration times correctly", async () => {
      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 10000);

      expect(mockCacheStore.set).toHaveBeenCalledWith(expect.any(String), mockResponse, 10000);
    });

    it("should handle special characters in query parameters", async () => {
      mockContext.req.query = vi.fn().mockReturnValue({
        query: "test search with spaces",
        perPage: "10",
        cursor: "abc-123_xyz",
      });

      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 2000);

      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/blocks-cursor=abc-123_xyz-perPage=10-query=test search with spaces",
      );
    });

    it("should work with all valid query parameter types", async () => {
      mockContext.req.query = vi.fn().mockReturnValue({
        perPage: "25",
        cursor: "cursor123",
        query: "search-query",
        blockType: "withdrawal",
        blockValidity: "invalid",
        tokenType: "USDC",
        status: "processing",
      });

      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 3000);

      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/blocks-blockType=withdrawal-blockValidity=invalid-cursor=cursor123-perPage=25-query=search-query-status=processing-tokenType=USDC",
      );
    });

    it("should handle numeric and string values in query parameters", async () => {
      mockContext.req.query = vi.fn().mockReturnValue({
        perPage: 10, // numeric value
        cursor: "abc123", // string value
        blockType: "proving", // string value
      });

      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 1500);

      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/blocks-blockType=proving-cursor=abc123-perPage=10",
      );
    });

    it("should call next function exactly once on cache miss", async () => {
      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 2000);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should clone response before caching", async () => {
      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 2000);

      expect(mockContext.res.clone).toHaveBeenCalled();
      expect(mockCacheStore.set).toHaveBeenCalledWith(
        expect.any(String),
        mockResponse, // The cloned response
        2000,
      );
    });

    it("should work with empty path", async () => {
      mockContext.req.path = "";
      mockContext.req.query = vi.fn().mockReturnValue({ perPage: "10" });

      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockCacheStore.get).toHaveBeenCalledWith("-perPage=10");
    });

    it("should maintain cache store singleton pattern", async () => {
      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 1000);
      await cacheMiddleware(mockContext, mockNext, 2000);

      // Should call getInstance twice but return the same instance
      expect(MemoryCacheStore.getInstance).toHaveBeenCalledTimes(2);
    });
  });
});
