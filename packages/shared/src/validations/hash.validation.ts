import { z } from "zod";
import { hashSchema } from "./utils";

export const hashValidation = z.strictObject({
  hash: hashSchema,
});

export type HashValidationType = z.infer<typeof hashValidation>;
