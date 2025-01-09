import { config } from "@intmax2-explorer-api/shared";
import axios, { AxiosError } from "axios";
import { API_TIMEOUT } from "../constants";
import type { IndexerResponse } from "../types";

export const getTotalBlockBuilders = async () => {
  const indexers = await getIndexers();
  return indexers.length;
};

const getIndexers = async () => {
  try {
    const response = await axios.get<IndexerResponse[]>(
      `${config.API_INDEXER_BASE_URL}/v1/indexer/builders`,
      {
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
