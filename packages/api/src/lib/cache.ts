import { config } from "@intmax2-explorer-api/shared";
import { nodeCache } from "./nodeCache";
import { RedisClient } from "./redis";

export const cache = config.REDIS_ENABLED ? RedisClient.getInstance() : nodeCache;
