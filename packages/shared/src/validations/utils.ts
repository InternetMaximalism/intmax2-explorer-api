import { z } from "zod";

export const hashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, {
  message: "Hash must be a valid 32-byte hex string starting with 0x",
});

export const blockNumberSchema = z
  .string()
  .refine((val) => !isNaN(Number(val)), {
    message: "blockNumber must be a valid number string",
  })
  .transform((val) => parseInt(val, 10))
  .refine((val) => val > 0, {
    message: "blockNumber must be a positive integer",
  })
  .refine((val) => val <= Number.MAX_SAFE_INTEGER, {
    message: "blockNumber must be less than or equal to Number.MAX_SAFE_INTEGER",
  });
