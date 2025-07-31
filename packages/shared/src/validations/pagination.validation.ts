import { z } from "zod";
import { MAX_PAGE_SIZE } from "../constants";
import { hashSchema } from "./utils";

export const paginationValidation = z.strictObject({
  perPage: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "pageSize must be a valid number string",
    })
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, {
      message: "pageSize must be a positive integer",
    })
    .refine((val) => val <= MAX_PAGE_SIZE, {
      message: "pageSize must be less than or equal to 250",
    })
    .optional(),
  cursor: hashSchema.optional(),
});

export type PaginationValidationType = z.infer<typeof paginationValidation>;
