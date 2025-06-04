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
