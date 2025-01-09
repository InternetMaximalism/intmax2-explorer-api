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

export interface BlockValidityProofResponse {
  updateWitness: UpdateWitness;
}

interface ValidityProof {
  proof: object;
  public_inputs: any[];
}

interface AccountMembershipProof {
  isIncluded: boolean;
  leafProof: any[];
  leafIndex: number;
  leaf: any;
}

interface UpdateWitness {
  isPrevAccountTree: boolean;
  validityProof: ValidityProof;
  blockMerkleProof: string[];
  accountMembershipProof: AccountMembershipProof;
}

export type RestrictedCountryCode = keyof typeof RESTRICTED_COUNTRY_CODES;
