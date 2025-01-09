import { getConnInfo } from "@hono/node-server/conninfo";
import { TooManyRequestsError, logger } from "@intmax2-explorer-api/shared";
import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { RATE_LIMIT } from "../constants";

const getClientIP = (c: Context): string => {
  const xForwardedFor = c.req.header("X-Forwarded-For");
  return xForwardedFor
    ? xForwardedFor.split(",")[0].trim()
    : getConnInfo(c).remote.address || "unknown";
};

export const limiter = rateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: RATE_LIMIT, // 1000 requests per windowMs
  standardHeaders: "draft-7",
  keyGenerator: (c) => {
    const ip = getClientIP(c);
    return ip;
  },
  skip: (c) => {
    const url = new URL(c.req.url);
    return url.pathname.startsWith("/v1/aml/score");
  },
  handler: (c) => {
    const ip = getClientIP(c);
    logger.warn(`Rate limit exceeded for IP: ${ip}`);
    throw new TooManyRequestsError("Rate limit exceeded");
  },
});
