import * as depositsController from "../controllers/deposits.controller";
import { createBaseRouter } from "./utils";

export const depositsRoute = createBaseRouter({
  listHandler: depositsController.listDeposits,
  getHandler: depositsController.getDeposit,
});
