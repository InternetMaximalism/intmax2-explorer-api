import { config, createNetworkClient } from "@intmax2-explorer-api/shared";
import axios, { AxiosError } from "axios";
import { formatEther } from "viem";
import { API_TIMEOUT, ETHEREUM_ADDRESS } from "../constants";
import type { TokenPriceResponse } from "../types";

export const getTVL = async () => {
  const ethereumClient = createNetworkClient("ethereum");
  const [balance, ethPrice] = await Promise.all([
    ethereumClient.getBalance({
      address: config.LIQUIDITY_CONTRACT_ADDRESS as `0x${string}`,
    }),
    getETHPrice(),
  ]);

  return Number(formatEther(balance)) * ethPrice;
};

const getETHPrice = async () => {
  try {
    const response = await axios.get<TokenPriceResponse>(
      `${config.API_TOKEN_BASE_URL}/v1/token-prices/list`,
      {
        params: {
          contractAddresses: ETHEREUM_ADDRESS,
        },
        timeout: API_TIMEOUT,
      },
    );

    const price = response.data.items[0]?.price;

    if (typeof price !== "number" || isNaN(price)) {
      throw new Error("Invalid eth price received from API");
    }

    return price;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(`Failed to fetch eth price: ${error.message}`, error);
    }

    throw new Error(
      "Unexpected error while fetching eth price",
      error instanceof Error ? error : undefined,
    );
  }
};
