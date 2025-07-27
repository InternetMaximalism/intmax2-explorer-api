import NodeCache from "node-cache";
import { CACHE_DEFAULT_CLEANUP_INTERVAL, CACHE_DEFAULT_STD_TTL } from "../constants";

export const nodeCache = new NodeCache({
  stdTTL: CACHE_DEFAULT_STD_TTL,
  checkperiod: CACHE_DEFAULT_CLEANUP_INTERVAL,
});
