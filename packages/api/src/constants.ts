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
  LIST: 15 * 1000, // 15 seconds
  DETAIL: 180 * 1000, // 180 seconds
  MODIFIED_DETAIL: 20 * 1000, // 20 seconds
  // node cache
  ETH_BALANCE: 300,
} as const;

export const CACHE_KEYS = {
  ETH_BALANCE: "ethBalance",
};

// token
export const ETHEREUM_ADDRESS = "0x0000000000000000000000000000000000000000";
