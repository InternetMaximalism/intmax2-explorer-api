import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RedisClient } from "./redis";

// Mock the shared module
vi.mock("@intmax2-explorer-api/shared", () => ({
  config: {
    REDIS_ENABLED: true,
    REDIS_URL: "redis://localhost:6379",
  },
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock ioredis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
};

vi.mock("ioredis", () => {
  return {
    default: vi.fn(() => mockRedis),
  };
});

// Import the mocked modules to access them in tests
import { config, logger } from "@intmax2-explorer-api/shared";
import Redis from "ioredis";

describe("RedisClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    (RedisClient as any).instance = undefined;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getInstance", () => {
    it("should return the same instance (singleton pattern)", () => {
      const instance1 = RedisClient.getInstance();
      const instance2 = RedisClient.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create Redis client when enabled", () => {
      config.REDIS_ENABLED = true;

      RedisClient.getInstance();

      expect(Redis).toHaveBeenCalledWith(config.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        lazyConnect: true,
        reconnectOnError: expect.any(Function),
      });
    });

    it("should not create Redis client when disabled", () => {
      config.REDIS_ENABLED = false;

      const instance = RedisClient.getInstance();

      expect(instance.getClient()).toBeNull();
      expect(logger.info).toHaveBeenCalledWith("Redis is disabled by configuration");
    });
  });

  describe("Redis event listeners", () => {
    beforeEach(() => {
      config.REDIS_ENABLED = true;
    });

    it("should set up event listeners", () => {
      RedisClient.getInstance();

      expect(mockRedis.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith("ready", expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith("close", expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith("reconnecting", expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith("end", expect.any(Function));
    });

    it("should log debug message on connect", () => {
      RedisClient.getInstance();

      const connectHandler = mockRedis.on.mock.calls.find((call) => call[0] === "connect")[1];
      connectHandler();

      expect(logger.debug).toHaveBeenCalledWith("Redis Client Connected");
    });

    it("should log error message on error", () => {
      RedisClient.getInstance();

      const errorHandler = mockRedis.on.mock.calls.find((call) => call[0] === "error")[1];
      const testError = new Error("Test error");
      testError.stack = "Error stack trace";
      errorHandler(testError);

      expect(logger.error).toHaveBeenCalledWith("Redis Client Error: Error stack trace");
    });
  });

  describe("reconnectOnError function", () => {
    it("should return true for target errors", () => {
      config.REDIS_ENABLED = true;
      RedisClient.getInstance();

      const redisOptions = (Redis as any).mock.calls[0][1];
      const reconnectOnError = redisOptions.reconnectOnError;

      expect(reconnectOnError(new Error("READONLY error"))).toBe(true);
      expect(reconnectOnError(new Error("ECONNRESET error"))).toBe(true);
      expect(reconnectOnError(new Error("ENOTFOUND error"))).toBe(true);
      expect(reconnectOnError(new Error("ECONNREFUSED error"))).toBe(true);
    });

    it("should return false for non-target errors", () => {
      config.REDIS_ENABLED = true;
      RedisClient.getInstance();

      const redisOptions = (Redis as any).mock.calls[0][1];
      const reconnectOnError = redisOptions.reconnectOnError;

      expect(reconnectOnError(new Error("Some other error"))).toBe(false);
    });
  });

  describe("get method", () => {
    beforeEach(() => {
      config.REDIS_ENABLED = true;
    });

    it("should return null when Redis client is null", async () => {
      config.REDIS_ENABLED = false;
      const client = RedisClient.getInstance();

      const result = await client.get("test-key");

      expect(result).toBeNull();
    });

    it("should return null when key does not exist", async () => {
      mockRedis.get.mockResolvedValue(null);
      const client = RedisClient.getInstance();

      const result = await client.get("non-existent-key");

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith("non-existent-key");
    });

    it("should parse JSON value correctly", async () => {
      const testData = { name: "test", value: 123 };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));
      const client = RedisClient.getInstance();

      const result = await client.get("test-key");

      expect(result).toEqual(testData);
    });

    it("should return raw value when JSON parsing fails", async () => {
      const rawValue = "simple-string-value";
      mockRedis.get.mockResolvedValue(rawValue);
      const client = RedisClient.getInstance();

      const result = await client.get("test-key");

      expect(result).toBe(rawValue);
    });
  });

  describe("set method", () => {
    beforeEach(() => {
      config.REDIS_ENABLED = true;
    });

    it('should return "OK" when Redis client is null', async () => {
      config.REDIS_ENABLED = false;
      const client = RedisClient.getInstance();

      const result = await client.set("test-key", "test-value");

      expect(result).toBe("OK");
    });

    it("should set string value without expiration", async () => {
      mockRedis.set.mockResolvedValue("OK");
      const client = RedisClient.getInstance();

      const result = await client.set("test-key", "test-value");

      expect(result).toBe("OK");
      expect(mockRedis.set).toHaveBeenCalledWith("test-key", "test-value");
    });

    it("should set object value as JSON string", async () => {
      mockRedis.set.mockResolvedValue("OK");
      const client = RedisClient.getInstance();
      const testObject = { name: "test", value: 123 };

      const result = await client.set("test-key", testObject);

      expect(result).toBe("OK");
      expect(mockRedis.set).toHaveBeenCalledWith("test-key", JSON.stringify(testObject));
    });

    it("should set value with expiration", async () => {
      mockRedis.set.mockResolvedValue("OK");
      const client = RedisClient.getInstance();

      const result = await client.set("test-key", "test-value", 3600);

      expect(result).toBe("OK");
      expect(mockRedis.set).toHaveBeenCalledWith("test-key", "test-value", "EX", 3600);
    });
  });

  describe("flushAll method", () => {
    beforeEach(() => {
      config.REDIS_ENABLED = true;
    });

    it("should quit Redis client successfully", async () => {
      mockRedis.quit.mockResolvedValue("OK");
      const client = RedisClient.getInstance();

      await client.flushAll();

      expect(mockRedis.quit).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith("Redis client quit successfully");
      expect(client.getClient()).toBeNull();
    });

    it("should handle quit error gracefully", async () => {
      const error = new Error("Quit failed");
      mockRedis.quit.mockRejectedValue(error);
      const client = RedisClient.getInstance();

      await client.flushAll();

      expect(mockRedis.quit).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith("Error during Redis quit: Quit failed");
      expect(client.getClient()).toBeNull();
    });

    it("should handle non-Error objects in quit failure", async () => {
      mockRedis.quit.mockRejectedValue("String error");
      const client = RedisClient.getInstance();

      await client.flushAll();

      expect(logger.error).toHaveBeenCalledWith("Error during Redis quit: Unknown error");
      expect(client.getClient()).toBeNull();
    });

    it("should do nothing when client is null", async () => {
      config.REDIS_ENABLED = false;
      const client = RedisClient.getInstance();

      await client.flushAll();

      expect(mockRedis.quit).not.toHaveBeenCalled();
    });
  });

  describe("getClient method", () => {
    it("should return Redis client when enabled", () => {
      config.REDIS_ENABLED = true;
      const client = RedisClient.getInstance();

      expect(client.getClient()).toBe(mockRedis);
    });

    it("should return null when disabled", () => {
      config.REDIS_ENABLED = false;
      const client = RedisClient.getInstance();

      expect(client.getClient()).toBeNull();
    });
  });
});
