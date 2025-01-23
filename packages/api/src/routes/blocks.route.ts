import { etag } from "hono/etag";
import * as blocksController from "../controllers/blocks.controller";
import { createBaseRouter } from "./utils";

export const blocksRoute = createBaseRouter({
  listHandler: blocksController.listBlocks,
  getHandler: blocksController.getBlock,
});

blocksRoute.use("/:hash/validityProof", etag());
blocksRoute.get("/:hash/validityProof", blocksController.getBlockValidityProof);
