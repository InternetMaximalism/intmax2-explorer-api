import { logger } from "@intmax2-explorer-api/shared";

export const performJob = async (): Promise<void> => {
  logger.info(`Starting job at ${new Date().toISOString()}`);
};