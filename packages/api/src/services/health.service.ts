import { config } from "@intmax2-explorer-api/shared";
import { version } from "../../../../package.json";
import { RedisClient } from "../lib/redis";

export const healthCheck = () => {
  const params = {
    status: "OK",
    timestamp: new Date().toISOString(),
    application: {
      version,
    },
  };
  return params;
};

export const redisCheck = async () => {
  if (!config.REDIS_ENABLED) {
    return {
      status: "OK",
      redis: "disabled",
    };
  }

  try {
    const redisStatus = await RedisClient.getInstance().ping();
    if (redisStatus !== "PONG") {
      return {
        status: "FAIL",
        redis: "unreachable",
      };
    }

    return {
      status: "OK",
      redis: "connected",
    };
  } catch (error) {
    return {
      status: "FAIL",
      redis: "error",
      error: (error as Error).message,
    };
  }
};
