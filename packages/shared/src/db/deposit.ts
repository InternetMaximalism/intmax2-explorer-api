import type { CollectionReference } from "@google-cloud/firestore";
import { FIRESTORE_COLLECTIONS } from "../constants";
import type { DepositData, DepositFilters, DepositInput } from "../types";
import { BaseRepository } from "./base";
import { db } from "./firestore";

export class Deposit extends BaseRepository<DepositData, DepositFilters, DepositInput> {
  private static instance: Deposit | null = null;
  protected readonly collection: CollectionReference;
  protected readonly defaultOrderField = "depositId";
  protected readonly defaultOrderDirection = "desc";

  private constructor() {
    super();
    this.collection = db.collection(FIRESTORE_COLLECTIONS.DEPOSIT);
  }

  public static getInstance() {
    if (!Deposit.instance) {
      Deposit.instance = new Deposit();
    }
    return Deposit.instance;
  }

  async addDepositsBatch(inputs: DepositInput[]) {
    return this.addBatch(inputs);
  }

  async listDeposits(filters: DepositFilters) {
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

  async getDepositByDepositHash(hash: string) {
    return this.getByHash(hash);
  }
}
