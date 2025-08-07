import { logger, timeOperation } from "@intmax2-explorer-api/shared";
import { name } from "../package.json";
import { performJob } from "./services/job.service";

async function main() {
  try {
    logger.info(`Starting ${name} job`);
    const { durationInSeconds } = await timeOperation(performJob);
    logger.info(`Completed ${name} job executed successfully in ${durationInSeconds}s`);
    process.exit(0);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    logger.error(error);
    process.exit(1);
  });
}
