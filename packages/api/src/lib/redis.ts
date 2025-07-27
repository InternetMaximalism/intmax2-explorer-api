import { config, logger } from "@intmax2-explorer-api/shared";
import Redis from "ioredis";

export class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;

  private constructor() {
    if (!config.REDIS_ENABLED) {
      logger.info("Redis is disabled by configuration");
      return;
    }

    this.client = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      lazyConnect: true,
      reconnectOnError: (err) => {
        logger.warn(`Redis reconnection triggered by error: ${err.message}`);
        const targetErrors = ["READONLY", "ECONNRESET", "ENOTFOUND", "ECONNREFUSED"];
        return targetErrors.some((target) => err.message.includes(target));
      },
    });

    this.client.on("connect", () => {
      logger.debug(`Redis Client Connected`);
    });

    this.client.on("ready", () => {
      logger.debug("Redis client ready for commands");
    });

    this.client.on("error", (error) => {
      logger.error(`Redis Client Error: ${error.stack}`);
    });

    this.client.on("close", () => {
      logger.debug("Redis client connection closed");
    });

    this.client.on("reconnecting", (time: number) => {
      logger.debug(`Redis client reconnecting in ${time}ms`);
    });

    this.client.on("end", () => {
      logger.debug("Redis client connection ended");
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public getClient(): Redis | null {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) {
      return Promise.resolve(null);
    }

    const cache = await this.client.get(key);
    if (!cache) {
      return null;
    }

    try {
      return JSON.parse(cache);
    } catch {
      return cache as T;
    }
  }

  async set<T>(key: string, value: T, expire?: number): Promise<"OK"> {
    if (!this.client) {
      return Promise.resolve("OK");
    }

    const stringValue = typeof value !== "string" ? JSON.stringify(value) : value;
    if (expire) {
      return await this.client.set(key, stringValue, "EX", expire);
    }

    return await this.client.set(key, stringValue);
  }

  public async flushAll() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.debug("Redis client quit successfully");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error(`Error during Redis quit: ${errorMessage}`);
      } finally {
        this.client = null;
      }
    }
  }
}
