import type { CollectionReference, Query } from "@google-cloud/firestore";
import { DEFAULT_PAGE_SIZE } from "../constants";
import { AppError, ErrorCode, logger } from "../lib";
import type { BaseData, BaseFilters } from "../types";
import { db } from "./firestore";

export abstract class BaseRepository<
  T extends BaseData,
  F extends BaseFilters,
  I extends Omit<T, "createdAt">,
> {
  protected abstract readonly collection: CollectionReference;
  protected abstract readonly defaultOrderField: keyof T;
  protected abstract readonly defaultOrderDirection: "asc" | "desc";

  protected async addBatch(inputs: I[], options: { merge?: boolean } = { merge: false }) {
    const batch = db.batch();
    const now = new Date();

    for (const input of inputs) {
      const ref = this.collection.doc(input.hash);
      batch.set(
        ref,
        {
          ...input,
          createdAt: now,
        },
        options,
      );
    }

    try {
      await batch.commit();
    } catch (error) {
      logger.error(error);
      throw new AppError(
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to add ${this.constructor.name.toLowerCase()}s`,
      );
    }
  }

  protected async list(filters: F, buildQuery?: (query: Query) => Query) {
    try {
      let query = this.collection.orderBy(
        this.defaultOrderField as string,
        this.defaultOrderDirection,
      );
      const perPage = filters?.perPage || DEFAULT_PAGE_SIZE;

      if (buildQuery) {
        query = buildQuery(query);
      }

      const countSnapshot = await query.count().get();
      const { count: totalCount } = countSnapshot.data();

      if (filters?.cursor) {
        const lastDoc = await this.collection.doc(filters.cursor).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      query = query.limit(perPage + 1);

      const snapshot = await query.get();
      const items = snapshot.docs.map((doc) => ({ ...doc.data() }) as T);
      const hasMore = items.length > perPage;

      if (hasMore) {
        items.pop();
      }

      return {
        items: items.map(this.formatData),
        nextCursor: hasMore ? items[items.length - 1].hash : null,
        hasMore,
        totalCount,
      };
    } catch (error) {
      logger.error(error);
      throw new AppError(
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to list ${this.constructor.name.toLowerCase()}s`,
      );
    }
  }

  protected async getByHash(hash: string) {
    try {
      const doc = await this.collection.doc(hash).get();
      if (!doc.exists) {
        return null;
      }
      return this.formatData(doc.data() as T);
    } catch (error) {
      logger.error(error);
      throw new AppError(
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to get ${this.constructor.name.toLowerCase()} by hash`,
      );
    }
  }

  protected formatData({ createdAt, ...rest }: T) {
    return rest;
  }
}
