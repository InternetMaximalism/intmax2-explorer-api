import { serve } from "@hono/node-server";
import { NotFoundError, config, handleError, logger } from "@intmax2-explorer-api/shared";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { appendTrailingSlash } from "hono/trailing-slash";
import { name } from "../package.json";
import { APP_TIMEOUT } from "./constants";
import { shutdown } from "./lib/shutdown";
import { configureLogging, corsMiddleware, limiter, requestMiddleware } from "./middlewares";
import { routes } from "./routes";

const { PORT: port } = config;

const app = new Hono({ strict: true });

app.use("*", corsMiddleware);
app.use(secureHeaders());
app.use(limiter);

app.use(timeout(APP_TIMEOUT));
app.use(requestMiddleware);

app.use(appendTrailingSlash());
app.use(compress());
app.use(prettyJSON());

configureLogging(app);

app.notFound(() => {
  throw new NotFoundError();
});

app.onError(handleError);

routes.forEach(({ path, route }) => {
  app.route(path, route);
});

logger.info("%s server is running on port %d", name.toLocaleUpperCase(), port);

const server = serve({
  fetch: app.fetch,
  port,
});

process.on("SIGTERM", () => shutdown(server));
process.on("SIGINT", () => shutdown(server));
