import type { Context } from "hono";
import * as healthService from "../services/health.service";

export const healthCheck = (c: Context) => {
  const result = healthService.healthCheck();
  return c.json(result);
};

export const redisCheck = async (c: Context) => {
  const result = await healthService.redisCheck();
  return c.json(result);
};
