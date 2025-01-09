import type { CollectionReference } from "@google-cloud/firestore";
import { FIRESTORE_COLLECTIONS } from "../constants";
import { AppError, ErrorCode, logger } from "../lib";
import type { BlockData, BlockFilters, BlockInput } from "../types";
import { BaseRepository } from "./base";
import { db } from "./firestore";

export class Block extends BaseRepository<BlockData, BlockFilters, BlockInput> {
  private static instance: Block | null = null;
  protected readonly collection: CollectionReference;
  protected readonly defaultOrderField = "blockNumber";
  protected readonly defaultOrderDirection = "desc";

  private constructor() {
    super();
    this.collection = db.collection(FIRESTORE_COLLECTIONS.BLOCK);
  }

  public static getInstance() {
    if (!Block.instance) {
      Block.instance = new Block();
    }
    return Block.instance;
  }

  async addBlocksBatch(inputs: BlockInput[]) {
    return this.addBatch(inputs);
  }

  async listBlocks(filters: BlockFilters) {
    return this.list(filters, (query) => {
      let modified = query;
      if (filters?.blockType) {
        modified = modified.where("blockType", "==", filters.blockType);
      }
      if (filters?.blockValidity) {
        modified = modified.where("blockValidity", "==", filters.blockValidity);
      }
      return modified;
    });
  }

  async getBlockByBlockHash(hash: string) {
    return this.getByHash(hash);
  }

  async getBlockByBlockNumber(blockNumber: number) {
    try {
      const query = await this.collection.where("blockNumber", "==", blockNumber).limit(1).get();
      if (query.empty) {
        return null;
      }
      return this.formatData(query.docs[0].data() as BlockData);
    } catch (error) {
      logger.error(error);
      throw new AppError(
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Failed to get block by block number",
      );
    }
  }
}
