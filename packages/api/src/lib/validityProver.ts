import { config } from "@intmax2-explorer-api/shared";
import axios, { AxiosError } from "axios";
import { API_TIMEOUT } from "../constants";
import type { BlockValidityProofResponse, ValidityProof } from "../types";

export const fetchBlockValidityProof = async (blockNumber: number) => {
  try {
    const response = await axios.get<BlockValidityProofResponse>(
      `${config.API_VALIDITY_PROVER_BASE_URL}/validity-prover/get-update-witness`,
      {
        params: {
          pubkey: 0,
          rootBlockNumber: blockNumber,
          leafBlockNumber: blockNumber,
          isPrevAccountTree: false,
        },
        timeout: API_TIMEOUT,
      },
    );

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(`Failed to fetch token price: ${error.message}`, error);
    }

    throw new Error(
      "Unexpected error while fetching token price",
      error instanceof Error ? error : undefined,
    );
  }
};

export const formatValidityProof = (blockValidityProof: BlockValidityProofResponse) => {
  return blockValidityProof.updateWitness.validityProof as ValidityProof;
};
