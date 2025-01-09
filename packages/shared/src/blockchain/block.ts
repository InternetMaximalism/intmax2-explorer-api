import { type Hex, encodePacked, keccak256 } from "viem";

export const calcBlockHash = (
  prevBlockHash: Hex,
  depositTreeRoot: Hex,
  signatureHash: Hex,
  blockNumber: number,
): string => {
  return keccak256(
    encodePacked(
      ["bytes32", "bytes32", "bytes32", "uint32"],
      [prevBlockHash, depositTreeRoot, signatureHash, blockNumber],
    ),
  );
};
