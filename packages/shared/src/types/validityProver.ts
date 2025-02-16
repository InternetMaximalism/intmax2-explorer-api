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
