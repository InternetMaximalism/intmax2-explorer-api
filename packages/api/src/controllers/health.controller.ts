import type { Context, TypedResponse } from "hono";
import * as healthService from "../services/health.service";

export const healthCheck = (c: Context): TypedResponse => {
  const result = healthService.healthCheck();
  return c.json(result);
};

export const redisCheck = async (c: Context): Promise<TypedResponse> => {
  const result = await healthService.redisCheck();
  return c.json(result);
};
