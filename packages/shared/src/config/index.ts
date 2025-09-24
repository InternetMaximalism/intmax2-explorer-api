import { bool, cleanEnv, num, str } from "envalid";
import { version } from "../../../../package.json";
import { rpcUrls } from "./validator";

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
  RATE_LIMIT_WINDOW_MS: num({
    default: 10 * 60 * 1000, // 10 minutes
  }),
  RATE_LIMIT: num({ default: 1000 }),
  CORS_MAX_AGE: num({ default: 7200 }),
  X_API_KEY: str({
    default: "dummy",
    desc: "API key used for authentication. Required to bypass rate limiting.",
  }),
  // gcp
  K_SERVICE: str({ default: process.env.CLOUD_RUN_JOB || "default-service" }),
  K_REVISION: str({
    default: process.env.CLOUD_RUN_EXECUTION || "default-revision",
  }),
  GOOGLE_CLOUD_PROJECT: str({ devDefault: "local-project" }),
  // firestore
  FIRESTORE_DATABASE_ID: str({ devDefault: "(default)" }),
  // redis
  REDIS_ENABLED: bool({ default: false }),
  REDIS_URL: str({ default: "redis://localhost:6379" }),
  // blockchain
  L1_CHAIN: str({ default: "sepolia" }),
  L2_CHAIN: str({ default: "scrollSepolia" }),
  L1_RPC_URLS: rpcUrls(),
  L2_RPC_URLS: rpcUrls(),
  BLOCK_RANGE_MIN: num({ default: 500 }),
  USE_MIGRATED_ABI: bool({
    default: false,
    desc: "Use migrated ABI for contracts. Set to `true` on mainnet, and `false` on testnet.",
  }),
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
  API_INDEXER_BASE_URL: str({
    devDefault: "http://localhost:3000",
    desc: "Base URL for the Indexer API",
  }),
  API_TOKEN_BASE_URL: str({
    devDefault: "http://localhost:3000",
    desc: "Base URL for the Token API",
  }),
  API_VALIDITY_PROVER_BASE_URL: str({
    devDefault: "http://localhost:3000",
    desc: "Base URL for the Validity Prover API",
  }),
});

export const isProduction = config.NODE_ENV === "production";
