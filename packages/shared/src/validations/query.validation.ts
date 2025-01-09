import { z } from "zod";

export const queryValidation = z.strictObject({
  query: z.union([
    z.string().regex(/^0x[a-fA-F0-9]{64}$/, {
      message: "Hash must be a valid 32-byte hex string starting with 0x",
    }),
    z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER, {
        message: "Number is too large. Maximum value is " + Number.MAX_SAFE_INTEGER,
      }),
  ]),
});

export type QueryValidationType = z.infer<typeof queryValidation>;
