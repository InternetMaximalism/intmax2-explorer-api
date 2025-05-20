import { describe, it, expect } from "vitest";
import { pointToString, calculateNonRegistrationLength } from "../../src/lib/utils";
import type { Hex } from "viem";

describe("pointToString", () => {
  it("should concatenate an array of Hex values correctly", () => {
    const points: Hex[] = ["0x1234", "0xabcd", "0xef56"];
    const result = pointToString(points);
    expect(result).toBe("0x1234abcdef56");
  });

  it("should handle a single Hex value", () => {
    const points: Hex[] = ["0x1234"];
    const result = pointToString(points);
    expect(result).toBe("0x1234");
  });

  it("should handle an empty array", () => {
    const points: Hex[] = [];
    const result = pointToString(points);
    expect(result).toBe("0x");
  });

  it("should handle Hex values of different lengths", () => {
    const points: Hex[] = ["0x1", "0x23", "0x456", "0x7890"];
    const result = pointToString(points);
    expect(result).toBe("0x1234567890");
  });

  it("should preserve leading zeros in Hex values", () => {
    const points: Hex[] = ["0x001", "0x0023"];
    const result = pointToString(points);
    expect(result).toBe("0x0010023");
  });

  it("should handle uppercase Hex values", () => {
    const points: Hex[] = ["0xABCD", "0xEF12"];
    const result = pointToString(points);
    expect(result).toBe("0xABCDEF12");
  });

  it("should handle lowercase Hex values", () => {
    const points: Hex[] = ["0xabcd", "0xef12"];
    const result = pointToString(points);
    expect(result).toBe("0xabcdef12");
  });

  it("should handle mixed case Hex values", () => {
    const points: Hex[] = ["0xAbCd", "0xEf12"];
    const result = pointToString(points);
    expect(result).toBe("0xAbCdEf12");
  });

  it("should handle very long arrays of Hex values", () => {
    const points: Hex[] = Array(100).fill("0xaa");
    const result = pointToString(points);
    expect(result).toBe("0x" + "aa".repeat(100));
  });
});

describe("calculateNonRegistrationLength", () => {
  it("should calculate length correctly for a string without 0x prefix", () => {
    const input = "1234567890";
    const result = calculateNonRegistrationLength(input);
    expect(result).toBe(1);
  });

  it("should calculate length correctly for a string with 0x prefix", () => {
    const input = "0x1234567890";
    const result = calculateNonRegistrationLength(input);
    expect(result).toBe(1);
  });

  it("should handle empty string without prefix", () => {
    const input = "";
    const result = calculateNonRegistrationLength(input);
    expect(result).toBe(0);
  });

  it("should handle empty string with prefix", () => {
    const input = "0x";
    const result = calculateNonRegistrationLength(input);
    expect(result).toBe(0);
  });

  it("should handle strings with length not divisible by 10", () => {
    const input = "12345";
    const result = calculateNonRegistrationLength(input);
    expect(result).toBe(0.5);
  });

  it("should handle strings with multiple units of 10", () => {
    const input = "0x" + "1234567890".repeat(5);
    const result = calculateNonRegistrationLength(input);
    expect(result).toBe(5);
  });

  it("should handle very long strings", () => {
    const input = "0x" + "1234567890".repeat(1000);
    const result = calculateNonRegistrationLength(input);
    expect(result).toBe(1000);
  });

  it("should handle non-hex characters (though the function does not validate)", () => {
    const input = "0xabcdefghij";
    const result = calculateNonRegistrationLength(input);
    expect(result).toBe(1);
  });

  it("should handle uppercase characters", () => {
    const input = "0xABCDEFGHIJ";
    const result = calculateNonRegistrationLength(input);
    expect(result).toBe(1);
  });

  it("should handle mixed case characters", () => {
    const input = "0xAbCdEfGhIj";
    const result = calculateNonRegistrationLength(input);
    expect(result).toBe(1);
  });
});
