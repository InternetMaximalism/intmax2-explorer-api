import type { DocumentReference, Transaction } from "@google-cloud/firestore";
import { FIRESTORE_COLLECTIONS } from "../constants";
import { AppError, ErrorCode, logger } from "../lib";
import type { FirestoreDocumentKey } from "../types";
import { db } from "./firestore";

export class Event {
  private readonly eventDocRef: DocumentReference;

  constructor(doc: FirestoreDocumentKey) {
    this.eventDocRef = db.collection(FIRESTORE_COLLECTIONS.EVENT).doc(doc);
  }

  async addOrUpdateEvent<T>(event: Partial<T>) {
    try {
      await this.eventDocRef.set(event, { merge: true });
    } catch (error) {
      logger.error(error);
      throw new AppError(500, ErrorCode.INTERNAL_SERVER_ERROR, "Failed to add or update event");
    }
  }

  async addOrUpdateEventWithTransaction<T>(transaction: Transaction, event: Partial<T>) {
    try {
      transaction.set(this.eventDocRef, event, { merge: true });
    } catch (error) {
      logger.error(error);
      throw new AppError(
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Failed to add or update event in transaction",
      );
    }
  }

  async getLatestEvent<T>() {
    try {
      const doc = await this.eventDocRef.get();
      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as T;
    } catch (error) {
      logger.error(error);
      throw new AppError(500, ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get event");
    }
  }
}
