import type { Hex } from "viem";

export const pointToString = (point: Hex[]) => {
  return "0x" + point.map((p) => p.slice(2)).join("");
};

export const calculateNonRegistrationLength = (str: string) => {
  const processedStr = str.startsWith("0x") ? str.slice(2) : str;
  return processedStr.length / 10;
};
