import type { Context, Next } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryCacheStore } from "../lib/cacheStore";
import { cacheMiddleware } from "./cache.middleware";

vi.mock("../lib/cacheStore", () => ({
  MemoryCacheStore: {
    getInstance: vi.fn(),
  },
}));

describe("cacheMiddleware", () => {
  let mockContext: Context;
  let mockNext: Next;
  let mockCacheStore: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCacheStore = {
      get: vi.fn(),
      set: vi.fn(),
    };

    (MemoryCacheStore.getInstance as any).mockReturnValue(mockCacheStore);

    const mockQuery = vi.fn().mockReturnValue({});

    mockContext = {
      req: {
        path: "/api/v1/blocks",
        query: mockQuery,
      },
      res: {
        clone: vi.fn(),
        status: 200,
        statusText: "OK",
        headers: new Headers({ "Content-Type": "application/json" }),
      },
    } as any;

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("cache hit", () => {
    it("should return cached response when cache exists", async () => {
      const cachedResponse = new Response("cached data");
      (mockContext.req.query as any).mockReturnValue({
        perPage: "10",
        cursor: "abc123",
      });
      mockCacheStore.get.mockReturnValue(cachedResponse);

      const result = await cacheMiddleware(mockContext, mockNext, 5000);

      expect(result).toBe(cachedResponse);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCacheStore.get).toHaveBeenCalledWith("/api/v1/blocks-cursor=abc123-perPage=10");
    });

    it("should not call next when cache hit occurs", async () => {
      const cachedResponse = new Response("cached");
      (mockContext.req.query as any).mockReturnValue({ perPage: "5" });
      mockCacheStore.get.mockReturnValue(cachedResponse);

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("cache miss", () => {
    it("should execute next and cache response when cache miss occurs", async () => {
      const responseBody = '{"data":"test"}';
      const clonedResponse = {
        text: vi.fn().mockResolvedValue(responseBody),
      };

      (mockContext.req.query as any).mockReturnValue({
        blockType: "proving",
        cursor: "abc123",
        perPage: "10",
      });
      (mockContext.res.clone as any).mockReturnValue(clonedResponse);
      mockCacheStore.get.mockReturnValue(undefined);

      const result = await cacheMiddleware(mockContext, mockNext, 5000);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCacheStore.set).toHaveBeenCalledWith(
        "/api/v1/blocks-blockType=proving-cursor=abc123-perPage=10",
        responseBody,
        expect.any(Response),
        5000,
      );
      expect(result).toBeInstanceOf(Response);
    });

    it("should call next exactly once", async () => {
      (mockContext.req.query as any).mockReturnValue({ perPage: "10" });
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue("test"),
      });
      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should clone response before reading body", async () => {
      const mockClonedResponse = {
        text: vi.fn().mockResolvedValue("test body"),
      };

      (mockContext.req.query as any).mockReturnValue({ perPage: "10" });
      (mockContext.res.clone as any).mockReturnValue(mockClonedResponse);
      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 2000);

      expect(mockContext.res.clone).toHaveBeenCalled();
      expect(mockClonedResponse.text).toHaveBeenCalled();
    });
  });

  describe("cache key generation", () => {
    it("should generate correct cache key with valid query parameters", async () => {
      (mockContext.req.query as any).mockReturnValue({
        perPage: "10",
        cursor: "abc123",
        invalidKey: "should-be-ignored",
      });
      mockCacheStore.get.mockReturnValue(undefined);
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue("test"),
      });

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockCacheStore.get).toHaveBeenCalledWith("/api/v1/blocks-cursor=abc123-perPage=10");
    });

    it("should handle empty query parameters", async () => {
      (mockContext.req.query as any).mockReturnValue({});
      mockCacheStore.get.mockReturnValue(undefined);
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue("test"),
      });

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockCacheStore.get).toHaveBeenCalledWith("/api/v1/blocks-");
    });

    it("should filter out invalid query parameters", async () => {
      (mockContext.req.query as any).mockReturnValue({
        perPage: "10",
        invalidParam: "value",
        anotherInvalid: "test",
        cursor: "abc123",
      });
      mockCacheStore.get.mockReturnValue(undefined);
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue("test"),
      });

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockCacheStore.get).toHaveBeenCalledWith("/api/v1/blocks-cursor=abc123-perPage=10");
    });

    it("should sort query parameters alphabetically", async () => {
      (mockContext.req.query as any).mockReturnValue({
        perPage: "10",
        blockType: "proving",
        cursor: "abc123",
        query: "search",
      });
      mockCacheStore.get.mockReturnValue(undefined);
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue("test"),
      });

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/blocks-blockType=proving-cursor=abc123-perPage=10-query=search",
      );
    });

    it("should handle different paths correctly", async () => {
      mockContext.req.path = "/api/v1/transactions";
      (mockContext.req.query as any).mockReturnValue({ perPage: "5" });
      mockCacheStore.get.mockReturnValue(undefined);
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue("test"),
      });

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockCacheStore.get).toHaveBeenCalledWith("/api/v1/transactions-perPage=5");
    });

    it("should handle all valid query parameter types", async () => {
      (mockContext.req.query as any).mockReturnValue({
        perPage: "20",
        cursor: "def456",
        query: "test-search",
        blockType: "withdrawal",
        blockValidity: "valid",
        tokenType: "erc20",
        status: "confirmed",
      });
      mockCacheStore.get.mockReturnValue(undefined);
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue("test"),
      });

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/blocks-blockType=withdrawal-blockValidity=valid-cursor=def456-perPage=20-query=test-search-status=confirmed-tokenType=erc20",
      );
    });

    it("should handle special characters in query parameters", async () => {
      (mockContext.req.query as any).mockReturnValue({
        query: "test%20search",
        perPage: "10",
      });
      mockCacheStore.get.mockReturnValue(undefined);
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue("test"),
      });

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockCacheStore.get).toHaveBeenCalledWith(
        "/api/v1/blocks-perPage=10-query=test%20search",
      );
    });
  });

  describe("response handling", () => {
    it("should create new response with correct properties", async () => {
      const responseBody = '{"result":"success"}';

      (mockContext.req.query as any).mockReturnValue({ perPage: "10" });

      const customRes = {
        clone: vi.fn().mockReturnValue({
          text: vi.fn().mockResolvedValue(responseBody),
        }),
        status: 201,
        statusText: "Created",
        headers: new Headers({ "X-Custom": "value" }),
      };

      mockContext.res = customRes as any;
      mockCacheStore.get.mockReturnValue(undefined);

      const result = await cacheMiddleware(mockContext, mockNext, 1000);

      expect(result).toBeInstanceOf(Response);
    });

    it("should use different expiration times correctly", async () => {
      (mockContext.req.query as any).mockReturnValue({
        blockType: "proving",
        cursor: "abc123",
        perPage: "10",
      });
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue("test"),
      });
      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 10000);

      expect(mockCacheStore.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Response),
        10000,
      );
    });

    it("should handle empty response body", async () => {
      (mockContext.req.query as any).mockReturnValue({ perPage: "10" });
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue(""),
      });
      mockCacheStore.get.mockReturnValue(undefined);

      const result = await cacheMiddleware(mockContext, mockNext, 1000);

      expect(mockCacheStore.set).toHaveBeenCalledWith(
        expect.any(String),
        "",
        expect.any(Response),
        1000,
      );
      expect(result).toBeInstanceOf(Response);
    });
  });

  describe("cache store integration", () => {
    it("should use singleton instance of cache store", async () => {
      (mockContext.req.query as any).mockReturnValue({ perPage: "10" });
      mockCacheStore.get.mockReturnValue(undefined);
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue("test"),
      });

      await cacheMiddleware(mockContext, mockNext, 1000);

      expect(MemoryCacheStore.getInstance).toHaveBeenCalled();
    });

    it("should call cache store methods with correct parameters", async () => {
      const expectedKey = "/api/v1/blocks-perPage=10";
      const responseBody = "test response";

      (mockContext.req.query as any).mockReturnValue({ perPage: "10" });
      (mockContext.res.clone as any).mockReturnValue({
        text: vi.fn().mockResolvedValue(responseBody),
      });
      mockCacheStore.get.mockReturnValue(undefined);

      await cacheMiddleware(mockContext, mockNext, 3000);

      expect(mockCacheStore.get).toHaveBeenCalledWith(expectedKey);
      expect(mockCacheStore.set).toHaveBeenCalledWith(
        expectedKey,
        responseBody,
        expect.any(Response),
        3000,
      );
    });
  });
});
