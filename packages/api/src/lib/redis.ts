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

    if (this.client) {
      this.client
        .connect()
        .then(() => this.client!.ping())
        .then(() => logger.info("Redis healthcheck OK"))
        .catch((e) => {
          logger.error(`Redis initial connect failed: ${e?.message || e}`);
          process.exit(1);
        });
    }
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
      return null;
    }

    try {
      const cache = await this.withSoftTimeout(this.client.get(key), 3000, "GET");
      if (!cache) {
        return null;
      }

      try {
        return JSON.parse(cache);
      } catch {
        return cache as T;
      }
    } catch (e) {
      logger.warn(`Redis GET failed for ${key}: ${(e as Error).message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, expire?: number): Promise<"OK"> {
    if (!this.client) {
      return "OK";
    }

    try {
      const stringValue = typeof value !== "string" ? JSON.stringify(value) : value;
      const promise = expire
        ? this.client.set(key, stringValue, "EX", expire)
        : this.client.set(key, stringValue);
      await this.withSoftTimeout(promise, 3000, "SET");

      return "OK";
    } catch (e) {
      logger.warn(`Redis SET failed for ${key}: ${(e as Error).message}`);
      return "OK";
    }
  }

  async ping(): Promise<"PONG"> {
    if (!this.client) {
      throw new Error("Redis client is not initialized");
    }

    try {
      const result = await this.client.ping();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Redis ping failed: ${errorMessage}`);
      throw error;
    }
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

  private async withSoftTimeout<T>(promise: Promise<T>, ms = 3000, op = "redis") {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        logger.warn(`[${op}] soft-timeout after ${ms}ms -> fallback`);
        reject(new Error("SOFT_TIMEOUT"));
      }, ms);
      promise
        .then((v) => {
          clearTimeout(timeout);
          resolve(v);
        })
        .catch((e) => {
          clearTimeout(timeout);
          reject(e);
        });
    });
  }
}
