import { blockPaginationValidation, hashValidation } from "@intmax2-explorer-api/shared";
import type { Context } from "hono";
import * as blocksService from "../services/blocks.service";

export const listBlocks = async (c: Context) => {
  const paramsQuery = c.req.query();
  const parsedQuery = await blockPaginationValidation.parseAsync(paramsQuery);
  const result = await blocksService.listBlocks(parsedQuery);
  return c.json(result);
};

export const getBlock = async (c: Context) => {
  const param = c.req.param();
  const requestParams = await hashValidation.parseAsync(param);
  const result = await blocksService.getBlock(requestParams);
  return c.json(result);
};

export const getBlockValidityProof = async (c: Context) => {
  const param = c.req.param();
  const requestParams = await hashValidation.parseAsync(param);
  const result = await blocksService.getBlockValidityProof(requestParams);
  return c.json(result);
};
