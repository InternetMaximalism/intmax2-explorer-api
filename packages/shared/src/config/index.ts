import { cleanEnv, num, str } from "envalid";
import { version } from "../../../../package.json";

export const config = cleanEnv(process.env, {
  // app
  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development",
  }),
  PORT: num({ default: 3000 }),
  LOG_LEVEL: str({
    choices: ["fatal", "error", "warn", "info", "debug", "trace"],
    default: "debug",
  }),
  SERVICE_VERSION: str({ default: version }),
  ALLOWED_ORIGINS: str({ default: "*", example: "http://localhost:3000,http://localhost:5173" }),
  RATE_LIMIT: num({ default: 1000 }),
  CORS_MAX_AGE: num({ default: 7200 }),
  X_API_KEY: str({ default: "dummy" }),
  // gcp
  K_SERVICE: str({ default: process.env.CLOUD_RUN_JOB || "default-service" }),
  K_REVISION: str({
    default: process.env.CLOUD_RUN_EXECUTION || "default-revision",
  }),
  GOOGLE_CLOUD_PROJECT: str({ devDefault: "local-project" }),
  // firestore
  FIRESTORE_DATABASE_ID: str({ devDefault: "(default)" }),
  // blockchain
  NETWORK_TYPE: str({
    choices: ["ethereum", "scroll"],
    default: "ethereum",
  }),
  NETWORK_ENVIRONMENT: str({
    choices: ["mainnet", "sepolia"],
    default: "sepolia",
  }),
  ALCHEMY_API_KEY: str(),
  // block
  VALIDITY_PROVER_API_BLOCK_BATCH_SIZE: num({ default: 15 }),
  VALIDITY_PROVER_API_SLEEP_TIME: num({
    default: 1000,
  }),
  // contract
  ROLLUP_CONTRACT_ADDRESS: str({ devDefault: "0x" }),
  ROLLUP_CONTRACT_DEPLOYED_BLOCK: num({ devDefault: 0 }),
  LIQUIDITY_CONTRACT_ADDRESS: str({ devDefault: "0x" }),
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK: num({ devDefault: 0 }),
  WITHDRAWAL_CONTRACT_ADDRESS: str({ devDefault: "0x" }),
  WITHDRAWAL_CONTRACT_DEPLOYED_BLOCK: num({ devDefault: 0 }),
  // api
  API_INDEXER_BASE_URL: str({ devDefault: "http://localhost:3000" }),
  API_TOKEN_BASE_URL: str({ devDefault: "http://localhost:3000" }),
  API_VALIDITY_PROVER_BASE_URL: str({ devDefault: "http://localhost:3000" }),
});

export const isProduction = config.NODE_ENV === "production";
