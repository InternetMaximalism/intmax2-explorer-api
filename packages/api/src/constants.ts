// app
export const BASE_PATH = "v1";
export const APP_TIMEOUT = 10_000;
export const RATE_LIMIT = 1000;
export const SHUTDOWN_TIMEOUT = 2000;

// logger
export const SLOW_THRESHOLD = 1000;
export const CLIENT_SERVICE = "clientServiceName";
export const LOG_EVENT_NAMES = {
  SLOW_REQUEST: "slowRequest",
} as const;

export type LogEventName = (typeof LOG_EVENT_NAMES)[keyof typeof LOG_EVENT_NAMES];

// timeout
export const CACHE_TIMEOUTS = {
  LIST: 15, // 15 seconds
  DETAIL: 180, // 180 seconds
  MODIFIED_DETAIL: 20, // 20 seconds
  ETH_BALANCE: 600, // 10 minutes
} as const;

export const CACHE_DEFAULT_STD_TTL = 300; // 5 minutes
export const CACHE_DEFAULT_CLEANUP_INTERVAL = 120; // 2 minutes

export const CACHE_KEYS = {
  ETH_BALANCE: "ethBalance",
};

// token
export const ETHEREUM_ADDRESS = "0x0000000000000000000000000000000000000000";
