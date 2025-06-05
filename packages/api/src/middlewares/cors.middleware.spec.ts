import { describe, it, expect } from "vitest";

describe("cors.middleware", () => {
  describe("getAllowedOrigins function behavior", () => {
    const getAllowedOrigins = (allowedOrigins: string) => {
      const origins = allowedOrigins.split(",").map((origin) => origin.trim());
      return origins.length === 1 && origins[0] === "*" ? "*" : origins;
    };

    it("should return '*' when config is exactly '*'", () => {
      const result = getAllowedOrigins("*");
      expect(result).toBe("*");
    });

    it("should return array when config contains multiple origins", () => {
      const result = getAllowedOrigins("http://localhost:3000,https://example.com");
      expect(result).toEqual(["http://localhost:3000", "https://example.com"]);
    });

    it("should return array when config contains single origin that is not '*'", () => {
      const result = getAllowedOrigins("https://example.com");
      expect(result).toEqual(["https://example.com"]);
    });

    it("should trim whitespace from each origin", () => {
      const result = getAllowedOrigins(" http://localhost:3000 , https://example.com ");
      expect(result).toEqual(["http://localhost:3000", "https://example.com"]);
    });

    it("should handle origins with protocols", () => {
      const result = getAllowedOrigins(
        "http://localhost:3000,https://example.com,ftp://files.example.com",
      );
      expect(result).toEqual([
        "http://localhost:3000",
        "https://example.com",
        "ftp://files.example.com",
      ]);
    });

    it("should handle origins with ports", () => {
      const result = getAllowedOrigins("http://localhost:3000,https://example.com:8080");
      expect(result).toEqual(["http://localhost:3000", "https://example.com:8080"]);
    });

    it("should handle subdomains", () => {
      const result = getAllowedOrigins("https://api.example.com,https://www.example.com");
      expect(result).toEqual(["https://api.example.com", "https://www.example.com"]);
    });

    it("should handle localhost variations", () => {
      const result = getAllowedOrigins(
        "http://localhost:3000,http://127.0.0.1:3000,http://0.0.0.0:3000",
      );
      expect(result).toEqual([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
      ]);
    });

    it("should handle empty strings in the list", () => {
      const result = getAllowedOrigins("http://localhost:3000,,https://example.com");
      expect(result).toEqual(["http://localhost:3000", "", "https://example.com"]);
    });

    it("should handle only commas", () => {
      const result = getAllowedOrigins(",,,");
      expect(result).toEqual(["", "", "", ""]);
    });
  });
});
