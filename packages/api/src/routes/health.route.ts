import { Hono } from "hono";
import * as healthController from "../controllers/health.controller";
import { apiKeyMiddleware } from "../middlewares/apiKey.middleware";

export const healthRoute = new Hono();

healthRoute.get("/", healthController.healthCheck);
healthRoute.get("/redis", apiKeyMiddleware, healthController.redisCheck);
