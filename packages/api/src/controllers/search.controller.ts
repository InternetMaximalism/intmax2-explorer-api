import { queryValidation } from "@intmax2-explorer-api/shared";
import type { Context, TypedResponse } from "hono";
import * as searchService from "../services/search.service";

export const getSearch = async (c: Context): Promise<TypedResponse> => {
  const query = c.req.query();
  const parsedQuery = await queryValidation.parseAsync(query);
  const result = await searchService.getSearch(parsedQuery);
  return c.json(result);
};
