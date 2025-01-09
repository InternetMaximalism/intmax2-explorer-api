import type { Context } from "hono";
import * as healthService from "../services/health.service";

export const healthCheck = async (c: Context) => {
  const result = healthService.healthCheck();
  return c.json(result);
};
