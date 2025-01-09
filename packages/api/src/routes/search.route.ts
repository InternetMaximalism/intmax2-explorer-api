import { Hono } from "hono";
import { CACHE_TIMEOUTS } from "../constants";
import * as searchController from "../controllers/search.controller";
import { cacheMiddleware } from "../middlewares";

export const searchRoute = new Hono();

searchRoute.use("*", (c, next) => cacheMiddleware(c, next, CACHE_TIMEOUTS.DETAIL));

searchRoute.get("/", searchController.getSearch);
