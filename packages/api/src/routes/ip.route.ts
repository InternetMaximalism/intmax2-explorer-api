import { Hono } from "hono";
import { etag } from "hono/etag";
import * as ipController from "../controllers/ip.controller";

export const ipRoute = new Hono();

ipRoute.use("*", etag());

ipRoute.get("/block-check", ipController.ipBlockCheck);
