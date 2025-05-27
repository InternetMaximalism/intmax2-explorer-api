import type { Abi, PublicClient } from "viem";
import { LiquidityAbi } from "../abi";
import { LIQUIDITY_CONTRACT_ADDRESS, TOKEN_MULTICALL_SIZE } from "../constants";
import type { TokenInfo, TokenType } from "../types";

export const fetchTokenData = async (ethereumClient: PublicClient, tokenIndexes: number[]) => {
  if (tokenIndexes.length === 0) {
    return [];
  }

  const contracts = tokenIndexes.map((tokenIndex) => ({
    address: LIQUIDITY_CONTRACT_ADDRESS,
    abi: LiquidityAbi as Abi,
    functionName: "getTokenInfo",
    args: [BigInt(tokenIndex)],
  }));

  const multicallResults = await ethereumClient.multicall({
    contracts,
    batchSize: TOKEN_MULTICALL_SIZE,
  });

  const tokenDetails = tokenIndexes.map((tokenIndex, index) => {
    const { result, status } = multicallResults[index];

    if (status !== "success") {
      throw new Error(`Token information fetch failed for index: ${index}`);
    }

    const { tokenType, tokenAddress: contractAddress } = result as {
      tokenType: TokenType;
      tokenAddress: string;
    };

    return {
      tokenType,
      tokenIndex,
      contractAddress,
    };
  });

  return getUniqueTokens(tokenDetails);
};

const getUniqueTokens = (tokens: TokenInfo[]) => {
  const seen = new Set<string>();
  return tokens.filter((token) => {
    const tokenKey = `${token.tokenType}-${token.tokenIndex}-${token.contractAddress}`;
    if (seen.has(tokenKey)) {
      return false;
    }

    seen.add(tokenKey);
    return true;
  });
};
