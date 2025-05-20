import { logger } from "@intmax2-explorer-api/shared";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryCacheStore } from "../../src/lib/cacheStore";

vi.mock("@intmax2-explorer-api/shared", () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe("MemoryCacheStore", () => {
  let cacheStore: MemoryCacheStore;

  beforeEach(() => {
    cacheStore = MemoryCacheStore.getInstance();
    cacheStore.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cacheStore.dispose();
    vi.useRealTimers();
  });

  test("getInstance returns singleton instance", () => {
    const instance1 = MemoryCacheStore.getInstance();
    const instance2 = MemoryCacheStore.getInstance();
    expect(instance1).toBe(instance2);
  });

  test("get returns undefined for non-existent key", () => {
    const result = cacheStore.get("non-existent-key");
    expect(result).toBeUndefined();
  });

  test("set and get store and retrieve a response", async () => {
    const testResponse = new Response("test body", {
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "text/plain" }),
    });

    await cacheStore.set("test-key", testResponse, 1000);

    const cachedResponse = cacheStore.get("test-key");
    expect(cachedResponse).toBeInstanceOf(Response);
    expect(await cachedResponse?.text()).toBe("test body");
    expect(cachedResponse?.status).toBe(200);
    expect(cachedResponse?.statusText).toBe("OK");
    expect(cachedResponse?.headers.get("content-type")).toBe("text/plain");
  });

  test("get returns undefined for expired entries", async () => {
    const testResponse = new Response("test body");
    await cacheStore.set("test-key", testResponse, 100);

    vi.advanceTimersByTime(101);

    const cachedResponse = cacheStore.get("test-key");
    expect(cachedResponse).toBeUndefined();
  });

  test("delete removes an entry from the cache", async () => {
    const testResponse = new Response("test body");
    await cacheStore.set("test-key", testResponse, 1000);

    cacheStore.delete("test-key");

    const cachedResponse = cacheStore.get("test-key");
    expect(cachedResponse).toBeUndefined();
  });

  test("clear removes all entries from the cache", async () => {
    const testResponse1 = new Response("test body 1");
    const testResponse2 = new Response("test body 2");

    await cacheStore.set("test-key-1", testResponse1, 1000);
    await cacheStore.set("test-key-2", testResponse2, 1000);

    cacheStore.clear();

    expect(cacheStore.get("test-key-1")).toBeUndefined();
    expect(cacheStore.get("test-key-2")).toBeUndefined();
  });

  test("cleanup removes expired entries", async () => {
    // @ts-expect-error accessing private method for testing
    const cleanupSpy = vi.spyOn(cacheStore, "cleanup");

    const testResponse1 = new Response("test body 1");
    const testResponse2 = new Response("test body 2");

    await cacheStore.set("test-key-1", testResponse1, 500);
    await cacheStore.set("test-key-2", testResponse2, 2000);

    vi.advanceTimersByTime(600);

    // @ts-expect-error accessing private method for testing
    cacheStore.cleanup();

    expect(cleanupSpy).toHaveBeenCalled();

    expect(cacheStore.get("test-key-1")).toBeUndefined();
    expect(await cacheStore.get("test-key-2")?.text()).toBe("test body 2");

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("cleaned up 1 expired"));

    cleanupSpy.mockRestore();
  });

  test("set overrides existing entries with the same key", async () => {
    const testResponse1 = new Response("test body 1");
    const testResponse2 = new Response("test body 2");

    await cacheStore.set("test-key", testResponse1, 1000);
    await cacheStore.set("test-key", testResponse2, 1000);

    const cachedResponse = cacheStore.get("test-key");
    expect(await cachedResponse?.text()).toBe("test body 2");
  });

  test("responds correctly to multiple cache operations", async () => {
    const testResponse1 = new Response("test body 1");
    const testResponse2 = new Response("test body 2");

    await cacheStore.set("test-key-1", testResponse1, 500);
    await cacheStore.set("test-key-2", testResponse2, 2000);

    expect(await cacheStore.get("test-key-1")?.text()).toBe("test body 1");
    expect(await cacheStore.get("test-key-2")?.text()).toBe("test body 2");

    cacheStore.delete("test-key-1");
    expect(cacheStore.get("test-key-1")).toBeUndefined();
    expect(await cacheStore.get("test-key-2")?.text()).toBe("test body 2");

    vi.advanceTimersByTime(2001);
    expect(cacheStore.get("test-key-2")).toBeUndefined();
  });
});
