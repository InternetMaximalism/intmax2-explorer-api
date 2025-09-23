import type { Context, TypedResponse } from "hono";
import * as statsService from "../services/stats.service";

export const getStats = async (c: Context): Promise<TypedResponse> => {
  const result = await statsService.getStats();
  return c.json(result);
};
