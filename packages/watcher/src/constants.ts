import { config } from "@intmax2-explorer-api/shared";

// rollup
export const ROLLUP_CONTRACT_ADDRESS = config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`;
export const ROLLUP_CONTRACT_DEPLOYED_BLOCK = BigInt(
  config.ROLLUP_CONTRACT_DEPLOYED_BLOCK,
) as bigint;

// liquidity
export const LIQUIDITY_CONTRACT_ADDRESS = config.LIQUIDITY_CONTRACT_ADDRESS as `0x${string}`;
export const LIQUIDITY_CONTRACT_DEPLOYED_BLOCK = BigInt(
  config.LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
) as bigint;

// withdrawal
export const WITHDRAWAL_CONTRACT_ADDRESS = config.WITHDRAWAL_CONTRACT_ADDRESS as `0x${string}`;
export const WITHDRAWAL_CONTRACT_DEPLOYED_BLOCK = BigInt(
  config.WITHDRAWAL_CONTRACT_DEPLOYED_BLOCK,
) as bigint;

// batch size
export const BLOCK_BATCH_SIZE = 100;
export const DEPOSIT_BATCH_SIZE = 100;
export const WITHDRAWAL_BATCH_SIZE = 100;

// multicall
export const TOKEN_MULTICALL_SIZE = 100;
