import type { Context } from "hono";
import * as statsService from "../services/stats.service";

export const getStats = async (c: Context) => {
  const result = await statsService.getStats();
  return c.json(result);
};
