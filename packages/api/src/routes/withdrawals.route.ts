import * as withdrawalsController from "../controllers/withdrawals.controller";
import { CACHE_TIMEOUTS } from "./../constants";
import { createBaseRouter } from "./utils";

export const withdrawalsRoute = createBaseRouter({
  listHandler: withdrawalsController.listWithdrawals,
  getHandler: withdrawalsController.getWithdrawal,
  options: {
    detailCacheTimeout: CACHE_TIMEOUTS.MODIFIED_DETAIL,
  },
});
