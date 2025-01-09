import * as withdrawalsController from "../controllers/withdrawals.controller";
import { createBaseRouter } from "./utils";

export const withdrawalsRoute = createBaseRouter({
  listHandler: withdrawalsController.listWithdrawals,
  getHandler: withdrawalsController.getWithdrawal,
});
