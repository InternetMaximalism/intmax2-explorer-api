import axios, { AxiosError } from "axios";
import { config } from "../config";
import { API_TIMEOUT } from "../constants";
import type { BlockValidityProofResponse, ValidityPisResponse, ValidityProof } from "../types";

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
      throw new Error(`Failed to fetch block validity proof: ${error.message}`, error);
    }

    throw new Error(
      `Unexpected error while fetching block validity proof: ${error instanceof Error ? error.message : "Unknown error"}`,
      error instanceof Error ? error : undefined,
    );
  }
};

export const formatValidityProof = (blockValidityProof: BlockValidityProofResponse) => {
  return blockValidityProof.updateWitness.validityProof as ValidityProof;
};

export const fetchValidityPis = async (blockNumber: number) => {
  try {
    const response = await axios.get<ValidityPisResponse>(
      `${config.API_VALIDITY_PROVER_BASE_URL}/validity-prover/get-validity-pis`,
      {
        params: {
          blockNumber,
        },
        timeout: API_TIMEOUT,
      },
    );

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(`Failed to fetch validity pis: ${error.message}`, error);
    }

    throw new Error(
      `Unexpected error while fetching validity pis: ${error instanceof Error ? error.message : "Unknown error"}`,
      error instanceof Error ? error : undefined,
    );
  }
};
