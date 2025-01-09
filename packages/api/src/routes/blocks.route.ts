import * as blocksController from "../controllers/blocks.controller";
import { createBaseRouter } from "./utils";

export const blocksRoute = createBaseRouter({
  listHandler: blocksController.listBlocks,
  getHandler: blocksController.getBlock,
});
