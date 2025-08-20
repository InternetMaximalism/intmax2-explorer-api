import {
  API_TIMEOUT,
  config,
  createNetworkClient,
  LIQUIDITY_CONTRACT_ADDRESS,
  logger,
} from "@intmax2-explorer-api/shared";
import axios, { AxiosError } from "axios";
import { formatEther } from "viem";
import { CACHE_KEYS, CACHE_TIMEOUTS, ETHEREUM_ADDRESS } from "../constants";
import type { TokenPriceResponse } from "../types";
import { cache } from "./cache";

export const getTVL = async () => {
  const [balance, ethPrice] = await Promise.all([getEthBalance(), getETHPrice()]);
  const tvl = Number(formatEther(balance)) * ethPrice;
  return tvl;
};

const getEthBalance = async () => {
  try {
    const ethereumClient = createNetworkClient("l1");
    const balance = await ethereumClient.getBalance({
      address: LIQUIDITY_CONTRACT_ADDRESS,
      blockTag: "safe",
    });
    await cache.set(CACHE_KEYS.ETH_BALANCE, balance.toString(), CACHE_TIMEOUTS.ETH_BALANCE);

    return balance;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error while fetching eth balance";

    const cached = await cache.get(CACHE_KEYS.ETH_BALANCE);
    if (cached) {
      logger.warn(`Using cached balance due to error: ${message}`);
      return BigInt(cached as string);
    }

    throw new Error(message);
  }
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
      error instanceof Error ? error.message : "Unknown error while fetching eth price",
    );
  }
};
