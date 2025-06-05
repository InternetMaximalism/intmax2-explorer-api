import { Hono } from "hono";
import { CACHE_TIMEOUTS } from "../constants";
import * as statsController from "../controllers/stats.controller";
import { cacheMiddleware } from "../middlewares";
import { etag } from "hono/etag";

export const statsRoute = new Hono();

statsRoute.use("/", (c, next) => cacheMiddleware(c, next, CACHE_TIMEOUTS.LIST));

statsRoute.use("/", etag());
statsRoute.get("/", statsController.getStats);
