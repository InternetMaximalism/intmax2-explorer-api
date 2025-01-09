import { getIP } from "@intmax2-explorer-api/shared";
import type { Context } from "hono";
import * as ipService from "../services/ip.service";

export const ipBlockCheck = (c: Context) => {
  const ip = getIP(c);
  const result = ipService.ipBlockCheck(ip);
  return c.json(result);
};
