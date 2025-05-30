import { type Context, Hono } from "hono";
import { etag } from "hono/etag";
import { CACHE_TIMEOUTS } from "../constants";
import { cacheMiddleware } from "../middlewares";

interface CacheOptions {
  detailCacheTimeout?: number;
}

interface RouterConfig {
  listHandler: (c: Context) => Promise<any>;
  getHandler: (c: Context) => Promise<any>;
  options?: CacheOptions;
}

export const createBaseRouter = (config: RouterConfig): Hono => {
  const router = new Hono();

  router.use("/", (c, next) => cacheMiddleware(c, next, CACHE_TIMEOUTS.LIST));

  router.use("/:hash", etag());
  router.use("/:hash", (c, next) =>
    cacheMiddleware(c, next, config.options?.detailCacheTimeout || CACHE_TIMEOUTS.DETAIL),
  );

  router.get("/", config.listHandler);
  router.get("/:hash", config.getHandler);

  return router;
};
