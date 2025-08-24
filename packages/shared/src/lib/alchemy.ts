import { Alchemy as AlchemyInstance, Network } from "alchemy-sdk";
import { config } from "../config";
import type { NetworkLayer } from "../types";
import { logger } from "./logger";

export class Alchemy {
  private static instances: Map<NetworkLayer, Alchemy> = new Map();
  private alchemy: AlchemyInstance;

  public static getInstance(networkLayer: NetworkLayer): Alchemy {
    if (!this.instances.has(networkLayer)) {
      this.instances.set(networkLayer, new Alchemy(networkLayer));
    }
    return this.instances.get(networkLayer)!;
  }

  private constructor(networkLayer: NetworkLayer) {
    logger.debug(`Attempting to get alchemy network for: "${networkLayer}"`);

    const network = this.getNetworkConfig(networkLayer);
    const settings = {
      apiKey: config.ALCHEMY_API_KEY,
      network,
      maxRetries: 5,
    };

    this.alchemy = new AlchemyInstance({ ...settings });
  }

  private getNetworkConfig(networkLayer: NetworkLayer): Network {
    switch (networkLayer) {
      case "l1":
        return Network[config.ALCHEMY_L1_NETWORK as keyof typeof Network];
      case "l2":
        return Network[config.ALCHEMY_L2_NETWORK as keyof typeof Network];
      default:
        throw new Error(`Unsupported network layer: ${networkLayer}`);
    }
  }

  async getBlock(blockNumber: bigint) {
    const blockHashOrBlockTag = `0x${Number(blockNumber).toString(16)}`;
    return this.alchemy.core.getBlock(blockHashOrBlockTag);
  }
}
