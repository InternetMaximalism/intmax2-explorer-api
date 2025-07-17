export { abi as LiquidityAbi } from "./Liquidity.json";
export { abi as WithdrawalAbi } from "./Withdrawal.json";

import { config } from "../config";
import { abi as RollupMigratedAbi } from "./Rollup.json";
import { abi as RollupTestnetAbi } from "./Rollup.testnet.json";

export const RollupAbi = config.USE_MIGRATED_ABI ? RollupMigratedAbi : RollupTestnetAbi;
