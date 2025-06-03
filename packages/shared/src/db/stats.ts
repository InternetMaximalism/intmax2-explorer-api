import type { DocumentReference, Transaction } from "@google-cloud/firestore";
import { FIRESTORE_COLLECTIONS } from "../constants";
import { AppError, ErrorCode, logger } from "../lib";
import type { FirestoreDocumentKey } from "../types";
import { db } from "./firestore";

export class Stats {
  private static instance: Stats | null = null;
  private readonly statsDocRef: DocumentReference;

  constructor(doc: FirestoreDocumentKey) {
    this.statsDocRef = db.collection(FIRESTORE_COLLECTIONS.STATS).doc(doc);
  }

  public static getInstance(doc: FirestoreDocumentKey) {
    if (!Stats.instance) {
      Stats.instance = new Stats(doc);
    }
    return Stats.instance;
  }

  async addOrUpdateStats<T>(stat: Partial<T>) {
    try {
      await this.statsDocRef.set(stat, { merge: true });
    } catch (error) {
      logger.error(error);
      throw new AppError(500, ErrorCode.INTERNAL_SERVER_ERROR, "Failed to add or update stats");
    }
  }

  async addOrUpdateStatsWithTransaction<T>(transaction: Transaction, stats: Partial<T>) {
    try {
      transaction.set(this.statsDocRef, stats, { merge: true });
    } catch (error) {
      logger.error(error);
      throw new AppError(
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Failed to add or update stats in transaction",
      );
    }
  }

  async getLatestStats<T>() {
    try {
      const doc = await this.statsDocRef.get();
      if (!doc.exists) {
        return null;
      }

      return doc.data() as T;
    } catch (error) {
      logger.error(error);
      throw new AppError(500, ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get stats");
    }
  }

  async getLatestStatsWithTransaction<T>(transaction: Transaction) {
    try {
      const doc = await transaction.get(this.statsDocRef);
      if (!doc.exists) {
        return null;
      }
      return doc.data() as T;
    } catch (error) {
      logger.error(error);
      throw new AppError(
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Failed to get stats in transaction",
      );
    }
  }
}
