import type { Context, Next } from "hono";
import { asyncLocalStorage } from "../lib/storage";

export const requestMiddleware = async (_: Context, next: Next) => {
  const requestId = crypto.randomUUID();
  await asyncLocalStorage.run({ requestId }, async () => {
    await next();
  });
};
