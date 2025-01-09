import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";

export const getIP = (c: Context) => {
  const xForwardedFor = c.req.header("X-Forwarded-For"); // NOTE: GCP Proxy
  const conn = getConnInfo(c);
  return (xForwardedFor ? xForwardedFor.split(",")[0].trim() : conn.remote.address) as string;
};
