import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryCacheStore } from "./cacheStore";

vi.mock("@intmax2-explorer-api/shared", () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe("MemoryCacheStore", () => {
  let cacheStore: MemoryCacheStore;

  beforeEach(() => {
    (MemoryCacheStore as any).instance = undefined;
    cacheStore = MemoryCacheStore.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cacheStore.dispose();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance when getInstance is called multiple times", () => {
      const instance1 = MemoryCacheStore.getInstance();
      const instance2 = MemoryCacheStore.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create a new instance after dispose is called", () => {
      const instance1 = MemoryCacheStore.getInstance();
      instance1.dispose();

      const instance2 = MemoryCacheStore.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Cache Operations", () => {
    const mockResponse = new Response("test body", {
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "application/json" },
    });

    it("should store and retrieve cached responses", async () => {
      const key = "test-key";
      const body = "test body";
      const maxAge = 5000;

      await cacheStore.set(key, body, mockResponse, maxAge);
      const cachedResponse = cacheStore.get(key);

      expect(cachedResponse).toBeDefined();
      expect(cachedResponse?.status).toBe(200);
      expect(cachedResponse?.statusText).toBe("OK");
      expect(await cachedResponse?.text()).toBe(body);
      expect(cachedResponse?.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return undefined for non-existent keys", () => {
      const result = cacheStore.get("non-existent-key");
      expect(result).toBeUndefined();
    });

    it("should delete cached entries", async () => {
      const key = "test-key";
      const body = "test body";
      const maxAge = 5000;

      await cacheStore.set(key, body, mockResponse, maxAge);
      expect(cacheStore.get(key)).toBeDefined();

      cacheStore.delete(key);
      expect(cacheStore.get(key)).toBeUndefined();
    });

    it("should clear all cached entries", async () => {
      const key1 = "test-key-1";
      const key2 = "test-key-2";
      const body = "test body";
      const maxAge = 5000;

      await cacheStore.set(key1, body, mockResponse, maxAge);
      await cacheStore.set(key2, body, mockResponse, maxAge);

      expect(cacheStore.get(key1)).toBeDefined();
      expect(cacheStore.get(key2)).toBeDefined();

      cacheStore.clear();

      expect(cacheStore.get(key1)).toBeUndefined();
      expect(cacheStore.get(key2)).toBeUndefined();
    });
  });

  describe("Expiration Handling", () => {
    const mockResponse = new Response("test body", {
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "application/json" },
    });

    it("should return undefined for expired entries", async () => {
      const key = "test-key";
      const body = "test body";
      const maxAge = 10;

      await cacheStore.set(key, body, mockResponse, maxAge);

      await new Promise((resolve) => setTimeout(resolve, 20));

      const result = cacheStore.get(key);
      expect(result).toBeUndefined();
    });

    it("should automatically remove expired entries when accessed", async () => {
      const key = "test-key";
      const body = "test body";
      const maxAge = 10;

      await cacheStore.set(key, body, mockResponse, maxAge);

      expect(cacheStore.get(key)).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 20));

      cacheStore.get(key);

      expect((cacheStore as any).cache.has(key)).toBeFalsy();
    });
  });

  describe("Cleanup Interval", () => {
    const mockResponse = new Response("test body", {
      status: 200,
      statusText: "OK",
    });

    it("should automatically clean up expired entries", async () => {
      const key1 = "test-key-1";
      const key2 = "test-key-2";
      const body = "test body";

      await cacheStore.set(key1, body, mockResponse, 50);
      await cacheStore.set(key2, body, mockResponse, 5000);

      await new Promise((resolve) => setTimeout(resolve, 100));

      cacheStore.get(key1);

      expect((cacheStore as any).cache.has(key1)).toBeFalsy();
      expect((cacheStore as any).cache.has(key2)).toBeTruthy();
    }, 10000);

    it("should log cleanup activity", async () => {
      const originalInterval = (cacheStore as any).cleanupIntervalDuration;
      (cacheStore as any).cleanupIntervalDuration = 50;
      (cacheStore as any).startCleanupInterval();

      const { logger } = await import("@intmax2-explorer-api/shared");
      const key = "test-key";
      const body = "test body";

      await cacheStore.set(key, body, mockResponse, 10);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("MemoryCacheStore: cleaned up"),
      );

      (cacheStore as any).cleanupIntervalDuration = originalInterval;
    }, 10000);
  });

  describe("Response Reconstruction", () => {
    it("should correctly reconstruct Response objects with all properties", async () => {
      const key = "test-key";
      const body = "test response body";
      const originalResponse = new Response(body, {
        status: 201,
        statusText: "Created",
        headers: {
          "Content-Type": "application/json",
          "X-Custom-Header": "custom-value",
        },
      });

      await cacheStore.set(key, body, originalResponse, 5000);
      const cachedResponse = cacheStore.get(key);

      expect(cachedResponse).toBeDefined();
      expect(cachedResponse?.status).toBe(201);
      expect(cachedResponse?.statusText).toBe("Created");
      expect(await cachedResponse?.text()).toBe(body);
      expect(cachedResponse?.headers.get("Content-Type")).toBe("application/json");
      expect(cachedResponse?.headers.get("X-Custom-Header")).toBe("custom-value");
    });

    it("should handle empty response bodies", async () => {
      const key = "test-key";
      const body = "";
      const originalResponse = new Response(body, {
        status: 200,
        statusText: "OK",
      });

      await cacheStore.set(key, body, originalResponse, 5000);
      const cachedResponse = cacheStore.get(key);

      expect(cachedResponse).toBeDefined();
      expect(cachedResponse?.status).toBe(200);
      expect(await cachedResponse?.text()).toBe("");
    });
  });

  describe("Dispose Method", () => {
    it("should handle multiple dispose calls gracefully", () => {
      cacheStore.dispose();

      expect(() => {
        cacheStore.dispose();
      }).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    const mockResponse = new Response("test", { status: 200 });

    it("should handle concurrent access to the same key", async () => {
      const key = "test-key";
      const body = "test body";
      const maxAge = 5000;

      await cacheStore.set(key, body, mockResponse, maxAge);

      const results = await Promise.all([
        Promise.resolve(cacheStore.get(key)),
        Promise.resolve(cacheStore.get(key)),
        Promise.resolve(cacheStore.get(key)),
      ]);

      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result?.status).toBe(200);
      });
    });

    it("should handle very large cache keys", async () => {
      const largeKey = "x".repeat(10000);
      const body = "test body";
      const maxAge = 5000;

      await cacheStore.set(largeKey, body, mockResponse, maxAge);
      const result = cacheStore.get(largeKey);

      expect(result).toBeDefined();
      expect(await result?.text()).toBe(body);
    });
  });
});
