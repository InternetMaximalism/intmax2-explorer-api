import { z } from "zod";
import { paginationValidation } from "./pagination.validation";

export const blockPaginationValidation = z
  .strictObject({
    blockType: z.enum(["Type0", "Type1", "Type2"]).optional(),
    blockValidity: z.enum(["Valid", "Invalid", "Empty"]).optional(),
  })
  .merge(paginationValidation);

export type BlockPaginationValidationType = z.infer<typeof blockPaginationValidation>;

export const depositPaginationValidation = z
  .strictObject({
    tokenType: z
      .enum(["0", "1", "2", "3"])
      .transform((v) => parseInt(v, 10))
      .optional(),
    status: z.enum(["Indexing", "Relayed", "Rejected", "Completed"]).optional(),
  })
  .merge(paginationValidation);

export type DepositPaginationValidationType = z.infer<typeof depositPaginationValidation>;

export const withdrawalPaginationValidation = depositPaginationValidation;

export type WithdrawalPaginationValidationType = z.infer<typeof withdrawalPaginationValidation>;
