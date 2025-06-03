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

export interface BlockValidityProofResponse {
  updateWitness: UpdateWitness;
}

export interface ValidityProof {
  proof: any;
  public_inputs: any[];
}

interface PublicState {
  blockTreeRoot: string;
  prevAccountTreeRoot: string;
  accountTreeRoot: string;
  nextAccountId: number;
  depositTreeRoot: string;
  blockHash: string;
  timestamp: number;
  blockNumber: number;
}

export interface ValidityPisResponse {
  publicState: PublicState;
  txTreeRoot: string;
  senderTreeRoot: string;
  isValidBlock: boolean;
}

export interface ValidityProofBlockNumberResponse {
  blockNumber: number;
}
