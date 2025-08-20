import { Alchemy as AlchemyInstance, Network } from "alchemy-sdk";
import { config } from "../config";
import type { NetworkLayer } from "../types";
import { logger } from "./logger";

export class Alchemy {
  private static instance: Alchemy | undefined;
  private alchemy: AlchemyInstance;

  public static getInstance(networkLayer: NetworkLayer) {
    if (!this.instance) {
      this.instance = new Alchemy(networkLayer);
    }
    return this.instance;
  }

  constructor(networkLayer: NetworkLayer) {
    logger.debug(`Attempting to get alchemy network for: "${networkLayer}"`);
    const network =
      networkLayer === "l1"
        ? Network[config.ALCHEMY_L1_NETWORK as keyof typeof Network]
        : Network[config.ALCHEMY_L2_NETWORK as keyof typeof Network];

    const settings = {
      apiKey: config.ALCHEMY_API_KEY,
      network,
      maxRetries: 5,
    };
    this.alchemy = new AlchemyInstance({ ...settings });
  }

  async getBlock(blockNumber: bigint) {
    const blockHashOrBlockTag = `0x${Number(blockNumber).toString(16)}`;
    return this.alchemy.core.getBlock(blockHashOrBlockTag);
  }
}
