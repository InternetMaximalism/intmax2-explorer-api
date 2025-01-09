import { depositPaginationValidation, hashValidation } from "@intmax2-explorer-api/shared";
import type { Context } from "hono";
import * as depositsService from "../services/deposits.service";

export const listDeposits = async (c: Context) => {
  const paramsQuery = c.req.query();
  const parsedQuery = await depositPaginationValidation.parseAsync(paramsQuery);
  const result = await depositsService.listDeposits(parsedQuery);
  return c.json(result);
};

export const getDeposit = async (c: Context) => {
  const param = c.req.param();
  const requestParams = await hashValidation.parseAsync(param);
  const result = await depositsService.getDeposit(requestParams);
  return c.json(result);
};
