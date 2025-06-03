import {
  type BlockStatus,
  type BlockType,
  type BlockValidity,
  INTERNAL_TO_TYPE_MAP,
  type InternalBlockType,
  type ValidityPisResponse,
} from "../types";

export const getInternalBlockType = (functionName: string): InternalBlockType => {
  return functionName === "postRegistrationBlock" ? "Registration" : "NonRegistration";
};

export const getBlockValidity = (
  validityProof: ValidityPisResponse | null,
  blockType: BlockType,
): BlockValidity => {
  if (!validityProof) {
    return "Pending";
  }

  // If the block type is 0, it indicates an empty block
  if (blockType === 0) {
    return "Empty";
  }

  switch (validityProof.isValidBlock) {
    case true:
      return "Valid";
    case false:
      return "Invalid";
    default:
      return "Pending";
  }
};

export const getBlockStatusFromValidityProof = (
  validityProof: ValidityPisResponse | null,
  latestValidityBlockNumber: number,
  blockNumber: number,
): BlockStatus => {
  if (!validityProof) {
    return "Indexing";
  }
  if (blockNumber > latestValidityBlockNumber) {
    return "Proving";
  }

  return "Completed";
};

export const getProvingBlockStatus = (
  blockNumber: number,
  latestValidityBlockNumber: number,
): BlockStatus => {
  return blockNumber <= latestValidityBlockNumber ? "Completed" : "Proving";
};

export const getBlockType = (
  transactionCount: number,
  internalBlockType: InternalBlockType,
): BlockType => {
  if (transactionCount === 0 && internalBlockType === "NonRegistration") {
    return 0;
  }

  return INTERNAL_TO_TYPE_MAP[internalBlockType];
};
