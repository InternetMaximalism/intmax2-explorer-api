import type { CollectionReference } from "@google-cloud/firestore";
import { FIRESTORE_COLLECTIONS, FIRESTORE_MAX_BATCH_SIZE } from "../constants";
import type { WithdrawalData, WithdrawalFilters, WithdrawalInput } from "../types";
import { BaseRepository } from "./base";
import { db } from "./firestore";

export class Withdrawal extends BaseRepository<WithdrawalData, WithdrawalFilters, WithdrawalInput> {
  private static instance: Withdrawal | null = null;
  protected readonly collection: CollectionReference;
  protected readonly defaultOrderField = "liquidityTimestamp";
  protected readonly defaultOrderDirection = "desc";

  private constructor() {
    super();
    this.collection = db.collection(FIRESTORE_COLLECTIONS.WITHDRAWAL);
  }

  public static getInstance() {
    if (!Withdrawal.instance) {
      Withdrawal.instance = new Withdrawal();
    }
    return Withdrawal.instance;
  }

  async addWithdrawalsBatch(inputs: WithdrawalInput[]) {
    return this.addBatch(inputs);
  }

  async updateWithdrawalsBatch(inputs: WithdrawalInput[]) {
    return this.addBatch(inputs, { merge: true });
  }

  async listWithdrawals(filters: WithdrawalFilters) {
    return this.list(filters, (query) => {
      let modified = query;
      if (filters?.tokenType != null) {
        modified = modified.where("tokenType", "==", filters.tokenType);
      }
      if (filters?.status) {
        modified = modified.where("status", "==", filters.status);
      }
      return modified;
    });
  }

  async getAll(filters: WithdrawalFilters) {
    const allItems = [];
    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const paginatedFilters = {
        ...filters,
        cursor,
        perPage: FIRESTORE_MAX_BATCH_SIZE,
      };

      const result = await this.listWithdrawals(paginatedFilters);

      allItems.push(...result.items);

      hasMore = result.hasMore;
      cursor = result.nextCursor ?? undefined;
    }

    return {
      items: allItems,
      totalCount: allItems.length,
    };
  }

  async getWithdrawalByWithdrawalHash(hash: string) {
    return this.getByHash(hash);
  }
}
