import { API_TIMEOUT, config } from "@intmax2-explorer-api/shared";
import axios, { AxiosError } from "axios";
import type { BlockBuilderMetaResponse } from "../types";

export const getTotalBlockBuilders = async () => {
  const { total } = await getBlockBuilderMeta();
  return total;
};

const getBlockBuilderMeta = async () => {
  try {
    const response = await axios.get<BlockBuilderMetaResponse>(
      `${config.API_INDEXER_BASE_URL}/v1/indexer/builders/meta`,
      {
        timeout: API_TIMEOUT,
      },
    );

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(`Failed to fetch block builders meta: ${error.message}`, error);
    }

    throw new Error(
      "Unexpected error while fetching block builders meta",
      error instanceof Error ? error : undefined,
    );
  }
};
