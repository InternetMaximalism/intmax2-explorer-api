import { z } from "zod";

export const hashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, {
  message: "Hash must be a valid 32-byte hex string starting with 0x",
});
