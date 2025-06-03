import { etag } from "hono/etag";
import * as blocksController from "../controllers/blocks.controller";
import { CACHE_TIMEOUTS } from "./../constants";
import { createBaseRouter } from "./utils";

export const blocksRoute = createBaseRouter({
  listHandler: blocksController.listBlocks,
  getHandler: blocksController.getBlock,
  options: {
    detailCacheTimeout: CACHE_TIMEOUTS.MODIFIED_DETAIL,
  },
});

blocksRoute.use("/:hash/validityProof", etag());
blocksRoute.get("/:hash/validityProof", blocksController.getBlockValidityProof);
