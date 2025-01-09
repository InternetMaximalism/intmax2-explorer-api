import { config, logger } from "@intmax2-explorer-api/shared";
import type { Context, Next } from "hono";
import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { CLIENT_SERVICE, LOG_EVENT_NAMES, SLOW_THRESHOLD } from "../constants";
import { asyncLocalStorage } from "../lib/storage";

export const loggingMiddleware = async (c: Context, next: Next) => {
  const startTime = Date.now();

  await next();

  const endTime = Date.now();
  const responseTime = endTime - startTime;

  if (config.NODE_ENV === "development" || responseTime > SLOW_THRESHOLD) {
    const requestId = asyncLocalStorage.getStore()?.requestId;
    logger.warn(
      {
        event: LOG_EVENT_NAMES.SLOW_REQUEST,
        clientServiceName: c.get(CLIENT_SERVICE),
        requestId,
        method: c.req.method,
        path: c.req.path,
        responseTime,
        status: c.res.status,
      },
      `Slow request detected: ${c.req.method} ${c.req.path} (${responseTime}ms)`,
    );
  }
};

export const configureLogging = (app: Hono) => {
  if (config.NODE_ENV === "development") {
    app.use(honoLogger());
  } else {
    app.use(loggingMiddleware);
  }
};
