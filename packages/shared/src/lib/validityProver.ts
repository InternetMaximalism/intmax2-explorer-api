import axios, { AxiosError } from "axios";
import { config } from "../config";
import { API_TIMEOUT } from "../constants";
import type {
  BlockValidityProofResponse,
  ValidityPisResponse,
  ValidityProof,
  ValidityProofBlockNumberResponse,
} from "../types";

export const fetchBlockValidityProof = async (blockNumber: number) => {
  try {
    const response = await axios.get<BlockValidityProofResponse>(
      `${config.API_VALIDITY_PROVER_BASE_URL}/get-update-witness`,
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

export const fetchValidityPis = async (blockNumber: number) => {
  try {
    const response = await axios.get<ValidityPisResponse>(
      `${config.API_VALIDITY_PROVER_BASE_URL}/get-validity-pis`,
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
      const errorMessage = error.response?.data || error.message;
      throw new Error(`Failed to fetch validity pis: ${errorMessage}`, error);
    }

    throw new Error(
      `Unexpected error while fetching validity pis: ${error instanceof Error ? error.message : "Unknown error"}`,
      error instanceof Error ? error : undefined,
    );
  }
};

export const fetchLatestValidityProofBlockNumber = async () => {
  try {
    const response = await axios.get<ValidityProofBlockNumberResponse>(
      `${config.API_VALIDITY_PROVER_BASE_URL}/validity-proof-block-number`,
      {
        timeout: API_TIMEOUT,
      },
    );

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const errorMessage = error.response?.data || error.message;
      throw new Error(`Failed to fetch latest validity proof block number: ${errorMessage}`, error);
    }

    throw new Error(
      `Unexpected error while fetching latest validity proof block number: ${error instanceof Error ? error.message : "Unknown error"}`,
      error instanceof Error ? error : undefined,
    );
  }
};
export const formatValidityProof = (blockValidityProof: BlockValidityProofResponse) => {
  return blockValidityProof.updateWitness.validityProof as ValidityProof;
};
