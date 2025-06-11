import { clearInterval } from "node:timers";
import { logger } from "@intmax2-explorer-api/shared";

interface CacheEntry {
  body: string;
  status: number;
  statusText: string;
  headers: [string, string][];
}

export class MemoryCacheStore {
  private static instance: MemoryCacheStore | undefined;
  private cache: Map<string, { response: CacheEntry; expiry: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupIntervalDuration = 1000 * 60 * 1;

  public static getInstance() {
    if (!this.instance) {
      this.instance = new MemoryCacheStore();
    }
    return this.instance;
  }

  private constructor() {
    this.startCleanupInterval();
  }

  get(key: string): Response | undefined {
    const cached = this.cache.get(key);
    if (!cached) {
      return undefined;
    }

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    const cachedResponse = cached.response;
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: new Headers(cachedResponse.headers),
    });
  }

  async set(key: string, value: Response, maxAge: number) {
    const body = await value.text();
    const result = {
      body,
      status: value.status,
      statusText: value.statusText,
      headers: Array.from(value.headers.entries()),
    };

    this.cache.set(key, { response: result, expiry: Date.now() + maxAge });
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  private startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => this.cleanup(), this.cleanupIntervalDuration);
  }

  private cleanup() {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info(`MemoryCacheStore: cleaned up ${deletedCount} expired entries`);
    }
  }

  public dispose() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.cache.clear();
    MemoryCacheStore.instance = undefined;
  }
}
