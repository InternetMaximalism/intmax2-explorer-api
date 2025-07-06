import { getConnInfo } from "@hono/node-server/conninfo";
import { config, logger, TooManyRequestsError } from "@intmax2-explorer-api/shared";
import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";

const getClientIP = (c: Context): string => {
  const xForwardedFor = c.req.header("X-Forwarded-For");
  return xForwardedFor
    ? xForwardedFor.split(",")[0].trim()
    : getConnInfo(c).remote.address || "unknown";
};

export const limiter = rateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: config.RATE_LIMIT, // RATE_LIMIT requests per windowMs
  standardHeaders: "draft-7",
  keyGenerator: (c) => {
    const ip = getClientIP(c);
    return ip;
  },
  skip: (c) => {
    const xApiKey = c.req.header("X-API-KEY");
    return xApiKey === config.X_API_KEY;
  },
  handler: (c) => {
    const ip = getClientIP(c);
    logger.warn(`Rate limit exceeded for IP: ${ip}`);
    throw new TooManyRequestsError("Rate limit exceeded");
  },
});
