import { z } from "zod";
import { blockNumberSchema, hashSchema } from "./utils";

export const queryValidation = z.strictObject({
  query: z.union([hashSchema, blockNumberSchema]),
});

export type QueryValidationType = z.infer<typeof queryValidation>;
