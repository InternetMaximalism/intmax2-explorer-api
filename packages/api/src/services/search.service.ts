import type { QueryValidationType } from "@intmax2-explorer-api/shared";
import type { SearchResult } from "./../types";
import { getBlock, getBlockByBlockNumber } from "./blocks.service";
import { getDeposit } from "./deposits.service";
import { getWithdrawal } from "./withdrawals.service";

export const getSearch = async ({ query }: QueryValidationType): Promise<SearchResult> => {
  if (typeof query === "number") {
    const block = await getBlockByBlockNumber(query);
    return {
      type: block ? "block" : "not_found",
      item: block,
    };
  }

  const [block, deposit, withdrawal] = await Promise.all([
    getBlock({ hash: query }).catch(() => null),
    getDeposit({ hash: query }).catch(() => null),
    getWithdrawal({ hash: query }).catch(() => null),
  ]);

  if (block) {
    return { type: "block", item: block };
  }
  if (deposit) {
    return { type: "deposit", item: deposit };
  }
  if (withdrawal) {
    return { type: "withdrawal", item: withdrawal };
  }

  return {
    type: "not_found",
    item: null,
  };
};
