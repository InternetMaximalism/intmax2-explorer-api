import { RESTRICTED_COUNTRY_CODES } from "./constants";

export interface AsyncLocalStorageStore {
  requestId: string;
}

export interface IndexerResponse {
  url: string;
  fee: number;
  speed: number;
}

export interface TokenPriceResponse {
  items: {
    id: string;
    symbol: string;
    price: number;
    contractAddress: string;
    decimals: number;
    image: string;
  }[];
  nextCursor: string | null;
  total: number;
}

export type RestrictedCountryCode = keyof typeof RESTRICTED_COUNTRY_CODES;
