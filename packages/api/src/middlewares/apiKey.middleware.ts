import { config, UnauthorizedError } from "@intmax2-explorer-api/shared";
import type { Context, Next } from "hono";

export const apiKeyMiddleware = async (c: Context, next: Next) => {
  const apiKey = c.req.header("X-API-KEY");

  if (!apiKey) {
    throw new UnauthorizedError("API key is required");
  }

  if (apiKey !== config.X_API_KEY) {
    throw new UnauthorizedError("Invalid API key provided");
  }

  await next();
};
