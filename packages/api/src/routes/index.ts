import { BASE_PATH } from "../constants";
import { blocksRoute } from "./blocks.route";
import { depositsRoute } from "./deposits.route";
import { healthRoute } from "./health.route";
import { searchRoute } from "./search.route";
import { statsRoute } from "./stats.route";
import { withdrawalsRoute } from "./withdrawals.route";

export const routes = [
  {
    path: `/${BASE_PATH}/health`,
    route: healthRoute,
  },
  {
    path: `/${BASE_PATH}/stats`,
    route: statsRoute,
  },
  {
    path: `/${BASE_PATH}/search`,
    route: searchRoute,
  },
  {
    path: `/${BASE_PATH}/blocks`,
    route: blocksRoute,
  },
  {
    path: `/${BASE_PATH}/deposits`,
    route: depositsRoute,
  },
  {
    path: `/${BASE_PATH}/withdrawals`,
    route: withdrawalsRoute,
  },
];
