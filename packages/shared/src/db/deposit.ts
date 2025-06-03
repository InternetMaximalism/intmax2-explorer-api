import type { CollectionReference, Query } from "@google-cloud/firestore";
import { FIRESTORE_COLLECTIONS, FIRESTORE_MAX_BATCH_SIZE } from "../constants";
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
    const existingSet = new Set<string>();

    const batchPromises = [];

    for (let i = 0; i < normalizedAddresses.length; i += FIRESTORE_MAX_BATCH_SIZE) {
      const batch = normalizedAddresses.slice(i, i + FIRESTORE_MAX_BATCH_SIZE);

      const batchPromise = this.collection
        .where("sender", "in", batch)
        .select("sender")
        .get()
        .then((snapshot) => {
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            console.log("data", data);
            if (data?.sender) {
              existingSet.add(data.sender.toLowerCase());
            }
          });
        })
        .catch((error) => {
          logger.error(`Error fetching existing addresses in batch: ${error.message}`);
        });

      batchPromises.push(batchPromise);
    }

    await Promise.all(batchPromises);
    return existingSet.size;
  }
}
