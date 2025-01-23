import type { CollectionReference } from "@google-cloud/firestore";
import { FIRESTORE_COLLECTIONS } from "../constants";
import { AppError, ErrorCode, logger } from "../lib";
import {
  BlockData,
  BlockDisplayType,
  BlockFilters,
  BlockInput,
  BlockType,
  DISPLAY_TO_INTERNAL_TYPE_MAP,
} from "../types";
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
        modified = this.applyBlockTypeFilter(modified, filters.blockType);
      }
      if (filters?.blockValidity) {
        modified = modified.where("blockValidity", "==", filters.blockValidity);
      }
      return modified;
    });
  }

  applyBlockTypeFilter(
    query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>,
    displayType: BlockDisplayType,
  ) {
    if (displayType === BlockDisplayType.NoTransaction) {
      return query.where("transactionCount", "==", 0);
    }

    query = query.where("transactionCount", ">", 0);

    const internalType = this.toInternalType(displayType);
    return query.where("blockType", "==", internalType);
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

  toInternalType(displayType: BlockDisplayType): BlockType {
    if (displayType === BlockDisplayType.NoTransaction) {
      throw new AppError(
        400,
        ErrorCode.BAD_REQUEST,
        "Cannot convert empty block type to internal type",
      );
    }

    const internalType = DISPLAY_TO_INTERNAL_TYPE_MAP[displayType];
    if (!internalType) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, `Invalid block type: ${displayType}`);
    }

    return internalType;
  }
}
