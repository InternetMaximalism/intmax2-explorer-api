export interface AsyncLocalStorageStore {
  requestId: string;
}

export interface BlockBuilderMetaResponse {
  total: number;
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

export interface CacheOptions {
  detailCacheTimeout?: number;
}

type SearchResultType = "block" | "deposit" | "withdrawal" | "not_found";

export interface SearchResult<T = unknown> {
  type: SearchResultType;
  item: T | null;
}
