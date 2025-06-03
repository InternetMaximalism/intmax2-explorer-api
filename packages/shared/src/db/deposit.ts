import type { CollectionReference, Query } from "@google-cloud/firestore";
import { FIRESTORE_COLLECTIONS } from "../constants";
import { logger } from "../lib";
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

  buildFilterQuery(query: Query, filters: DepositFilters) {
    let modified = query;
    if (filters?.tokenType != null) {
      modified = modified.where("tokenType", "==", filters.tokenType);
    }
    if (filters?.status) {
      modified = modified.where("status", "==", filters.status);
    }
    return modified;
  }

  async listDeposits(filters: DepositFilters) {
    return this.list(filters);
  }

  async getDepositByDepositHash(hash: string) {
    return this.getByHash(hash);
  }

  async getExistingAddressCount(addresses: string[]) {
    if (!addresses.length) return 0;

    const normalizedAddresses = [...new Set(addresses.map((addr) => addr.toLowerCase()))];

    const countPromises = normalizedAddresses.map(async (address) => {
      try {
        const snapshot = await this.collection.where("sender", "==", address).count().get();
        return snapshot.data().count > 0 ? 1 : 0;
      } catch (error) {
        logger.error(error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Unknown error occurred while checking address existence",
        );
      }
    });

    const results: number[] = await Promise.all(countPromises);
    const existingCount: number = results.reduce(
      (sum: number, exists: number): number => sum + exists,
      0,
    );

    return existingCount;
  }
}
