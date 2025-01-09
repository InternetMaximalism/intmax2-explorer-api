import { hashValidation, withdrawalPaginationValidation } from "@intmax2-explorer-api/shared";
import type { Context } from "hono";
import * as withdrawalsService from "../services/withdrawals.service";

export const listWithdrawals = async (c: Context) => {
  const paramsQuery = c.req.query();
  const parsedQuery = await withdrawalPaginationValidation.parseAsync(paramsQuery);
  const result = await withdrawalsService.listWithdrawals(parsedQuery);
  return c.json(result);
};

export const getWithdrawal = async (c: Context) => {
  const param = c.req.param();
  const requestParams = await hashValidation.parseAsync(param);
  const result = await withdrawalsService.getWithdrawal(requestParams);
  return c.json(result);
};
