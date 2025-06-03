import type { CollectionReference, Query } from "@google-cloud/firestore";
import { FIRESTORE_COLLECTIONS } from "../constants";
import type { WithdrawalData, WithdrawalFilters, WithdrawalInput } from "../types";
import { BaseRepository } from "./base";
import { db } from "./firestore";

export class Withdrawal extends BaseRepository<WithdrawalData, WithdrawalFilters, WithdrawalInput> {
  private static instance: Withdrawal | null = null;
  protected readonly collection: CollectionReference;
  protected readonly defaultOrderField = "relayedTimestamp";
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

  buildFilterQuery(query: Query, filters: WithdrawalFilters) {
    let modified = query;
    if (filters?.tokenType != null) {
      modified = modified.where("tokenType", "==", filters.tokenType);
    }
    if (filters?.status) {
      modified = modified.where("status", "==", filters.status);
    }
    return modified;
  }

  async listWithdrawals(filters: WithdrawalFilters) {
    return this.list(filters);
  }

  async listAllWithdrawals(filters: WithdrawalFilters) {
    return this.listAll(filters);
  }

  async getWithdrawalByWithdrawalHash(hash: string) {
    return this.getByHash(hash);
  }
}
