import pino from "pino";
import pretty from "pino-pretty";
import { config } from "../config";

const stream = pretty({
  colorize: true,
  ignore: "pid,hostname",
});

export const logger = pino(
  {
    level: config.LOG_LEVEL,
    messageKey: "message",
    formatters: {
      level: (label) => ({ severity: label.toUpperCase() }),
    },
    base: {
      serviceContext: {
        service: config.K_SERVICE,
        revision: config.K_REVISION,
        version: config.SERVICE_VERSION,
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  config.isProduction ? undefined : stream,
);

export const debugLog = (obj: any, message: string = "Debug Object:") => {
  if (config.isDevelopment) {
    console.log("\n" + message);
    console.dir(obj, { depth: null, colors: true });
  }
};
