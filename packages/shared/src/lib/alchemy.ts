import { Alchemy as AlchemyInstance, Network } from "alchemy-sdk";
import { config } from "../config";
import { logger } from "./logger";

export class Alchemy {
  private alchemy: AlchemyInstance;

  constructor(networkType: "ethereum" | "scroll") {
    const network = this.getNetwork(networkType);
    logger.debug(`Attempting to get alchemy network for: "${network}"`);

    const settings = {
      apiKey: config.ALCHEMY_API_KEY,
      network,
      maxRetries: 5,
    };
    this.alchemy = new AlchemyInstance({ ...settings });
  }

  private getNetwork = (networkType: "ethereum" | "scroll") => {
    const networkKey = `${networkType}-${config.NETWORK_ENVIRONMENT}`;
    switch (networkKey) {
      case `ethereum-mainnet`:
        return Network.ETH_MAINNET;
      case "ethereum-sepolia":
        return Network.ETH_SEPOLIA;
      case "scroll-mainnet":
        return Network.SCROLL_MAINNET;
      case "scroll-sepolia":
        return Network.SCROLL_SEPOLIA;
      default:
        throw new Error(`Unsupported network: ${networkKey}. Please check the configuration.`);
    }
  };

  async getBlock(blockNumber: bigint) {
    const blockHashOrBlockTag = `0x${Number(blockNumber).toString(16)}`;
    return this.alchemy.core.getBlock(blockHashOrBlockTag);
  }
}
