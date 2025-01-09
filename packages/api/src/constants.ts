// app
export const BASE_PATH = "v1";
export const APP_TIMEOUT = 30_000;
export const RATE_LIMIT = 1000;
export const SHUTDOWN_TIMEOUT = 2000;

// logger
export const SLOW_THRESHOLD = 1000;
export const CLIENT_SERVICE = "clientServiceName";
export const LOG_EVENT_NAMES = {
  SLOW_REQUEST: "slowRequest",
  RISK_ASSESSMENT: "riskAssessment",
} as const;

export type LogEventName = (typeof LOG_EVENT_NAMES)[keyof typeof LOG_EVENT_NAMES];

// timeout
export const API_TIMEOUT = 10 * 1000; // 10 seconds
export const CACHE_TIMEOUTS = {
  LIST: 15 * 1000, // 15 seconds
  DETAIL: 60 * 1000, // 60 seconds
} as const;

// token
export const ETHEREUM_ADDRESS = "0x0000000000000000000000000000000000000000";

// restricted countries
export const RESTRICTED_COUNTRY_CODES = {
  US: "United States",
  KP: "North Korea",
  IR: "Iran",
  SY: "Syria",
  CU: "Cuba",
  RU: "Russia",
  MM: "Myanmar",
  SD: "Sudan",
  YE: "Yemen",
  BY: "Belarus",
} as const;
