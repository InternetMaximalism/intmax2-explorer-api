import type { CollectionReference, Query } from "@google-cloud/firestore";
import { DEFAULT_PAGE_SIZE, FIRESTORE_MAX_BATCH_SIZE } from "../constants";
import { AppError, ErrorCode, logger } from "../lib";
import type { BaseData, BaseFilters } from "../types";
import { db } from "./firestore";

interface IFilterBuilder<F extends BaseFilters> {
  buildFilterQuery(query: Query, filters: F): Query;
}

export abstract class BaseRepository<
  T extends BaseData,
  F extends BaseFilters,
  I extends Omit<T, "createdAt">,
> implements IFilterBuilder<F>
{
  protected abstract readonly collection: CollectionReference;
  protected abstract readonly defaultOrderField: keyof T;
  protected abstract readonly defaultOrderDirection: "asc" | "desc";

  abstract buildFilterQuery(query: Query, filters: F): Query;

  protected async addBatch(inputs: I[], options: { merge?: boolean } = { merge: false }) {
    const batches = [];
    const now = new Date();

    try {
      for (let i = 0; i < inputs.length; i += FIRESTORE_MAX_BATCH_SIZE) {
        const batch = db.batch();
        const batchInputs = inputs.slice(i, i + FIRESTORE_MAX_BATCH_SIZE);

        for (const input of batchInputs) {
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
        batches.push(batch.commit());
      }

      await Promise.all(batches);

      return {
        count: inputs.length,
      };
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
      const orderField = filters?.orderBy || (this.defaultOrderField as string);
      const orderDirection = filters?.orderDirection || this.defaultOrderDirection;

      let query = this.collection.orderBy(orderField, orderDirection);
      const perPage = filters?.perPage || DEFAULT_PAGE_SIZE;

      query = this.buildFilterQuery(query, filters);

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
        items: this.formatDataBulk(items),
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

  protected async listAll(filters: F) {
    const allItems = [];
    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const paginatedFilters = {
        ...filters,
        cursor,
        perPage: FIRESTORE_MAX_BATCH_SIZE,
      } as F;

      const result = await this.list(paginatedFilters);
      allItems.push(...result.items);
      hasMore = result.hasMore;
      cursor = result.nextCursor ?? undefined;
    }

    return {
      items: allItems,
      totalCount: allItems.length,
    };
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

  protected formatDataBulk(items: T[]) {
    const result = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
      result[i] = this.formatData(items[i]);
    }
    return result;
  }
}
