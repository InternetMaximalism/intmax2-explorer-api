import { describe, expect, it } from "vitest";
import { type HashValidationType, hashValidation } from "./hash.validation";

describe("Hash Validation Object Schema", () => {
  it("should validate a valid hash object", () => {
    const validHashObject = {
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    };
    const result = hashValidation.safeParse(validHashObject);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validHashObject);
    }
  });

  it("should reject an object with an invalid hash", () => {
    const invalidHashObject = {
      hash: "invalid-hash",
    };
    const result = hashValidation.safeParse(invalidHashObject);
    expect(result.success).toBe(false);
  });

  it("should reject an object with missing hash property", () => {
    const invalidObject = {};
    const result = hashValidation.safeParse(invalidObject);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "Invalid input: expected string, received undefined",
      );
    }
  });

  it("should reject an object with additional properties", () => {
    const invalidObject = {
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      extraProperty: "should not be here",
    };
    const result = hashValidation.safeParse(invalidObject);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Unrecognized key");
    }
  });

  it("should correctly type the HashValidationType", () => {
    const typedObject: HashValidationType = {
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    };
    expect(typedObject).toBeDefined();
  });
});
