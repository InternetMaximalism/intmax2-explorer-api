import type { ServerType } from "@hono/node-server";
import { logger } from "@intmax2-explorer-api/shared";
import { SHUTDOWN_TIMEOUT } from "../constants";
import { cache } from "./cache";

let isShuttingDown = false;

export const shutdown = (server: ServerType) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info("Shutting down server...");

  server.close(async () => {
    logger.info("Server closed for new connections");
    try {
      await cache.flushAll();
      process.exit(0);
    } catch (error) {
      logger.error(`Shutdown failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.info("Force exiting process");
    process.exit(0);
  }, SHUTDOWN_TIMEOUT);
};
