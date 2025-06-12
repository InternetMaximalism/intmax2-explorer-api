import type { Context, Next } from "hono";
import { MemoryCacheStore } from "../lib/cacheStore";

const validateKeys = [
  "perPage",
  "cursor",
  "query",
  "blockType",
  "blockValidity",
  "tokenType",
  "status",
];

export const cacheMiddleware = async (c: Context, next: Next, expire: number) => {
  const cacheKey = getCacheKey(c);
  const cacheStore = MemoryCacheStore.getInstance();

  const cache = cacheStore.get(cacheKey);
  if (cache) {
    return cache;
  }

  await next();

  const cRes = c.res.clone();
  const body = await cRes.text();

  const newResponse = new Response(body, {
    status: cRes.status,
    statusText: cRes.statusText,
    headers: cRes.headers,
  });

  cacheStore.set(cacheKey, body, newResponse, expire);

  return newResponse;
};

const getCacheKey = (c: Context) => {
  const path = c.req.path;
  const keys = Object.keys(c.req.query())
    .filter((key) => validateKeys.includes(key))
    .sort((a, b) => a.localeCompare(b));
  const cacheKey = `${path}-${keys.map((key) => `${key}=${c.req.query()[key]}`).join("-")}`;

  return cacheKey;
};
