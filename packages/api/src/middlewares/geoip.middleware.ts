import { ForbiddenError, getIP } from "@intmax2-explorer-api/shared";
import geoip from "geoip-lite";
import { createMiddleware } from "hono/factory";
import { RESTRICTED_COUNTRY_CODES } from "../constants";
import type { RestrictedCountryCode } from "../types";

// NOTE: hono-geo-middleware
export const geoIPRestriction = createMiddleware(async (c, next) => {
  const ip = getIP(c);
  const geo = geoip.lookup(ip as string);

  if (geo && geo.country in RESTRICTED_COUNTRY_CODES) {
    throw new ForbiddenError(
      `Access denied from ${RESTRICTED_COUNTRY_CODES[geo.country as RestrictedCountryCode]} IP address`,
    );
  }

  await next();
});
