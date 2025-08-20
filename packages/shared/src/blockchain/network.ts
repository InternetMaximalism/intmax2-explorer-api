import { createPublicClient, fallback, http, type PublicClient } from "viem";
import * as chains from "viem/chains";
import { config } from "../config";
import type { NetworkLayer } from "../types";

const l1Rpcs = config.L1_RPC_URLS.map((rpc) => http(rpc));
const l2Rpcs = config.L2_RPC_URLS.map((rpc) => http(rpc));

const getClientConfig = (networkLayer: NetworkLayer) => {
  if (networkLayer === "l1") {
    return {
      chain: chains[config.L1_CHAIN as keyof typeof chains],
      rpcUrls: l1Rpcs,
    };
  }

  return {
    chain: chains[config.L2_CHAIN as keyof typeof chains],
    rpcUrls: l2Rpcs,
  };
};

export const createNetworkClient = (networkLayer: NetworkLayer) => {
  const { chain, rpcUrls } = getClientConfig(networkLayer);

  return createPublicClient({
    batch: {
      multicall: true,
    },
    chain,
    transport: fallback(rpcUrls, {
      retryCount: 3,
    }),
  }) as PublicClient;
};
