import { FIRESTORE_DOCUMENT_EVENTS, FIRESTORE_DOCUMENT_STATS } from "../constants";

export type CustomError = {
  code: string;
  message: string;
};

export const FIRESTORE_DOCUMENT_TYPES = {
  ...FIRESTORE_DOCUMENT_EVENTS,
  ...FIRESTORE_DOCUMENT_STATS,
};

export type FirestoreDocumentKey =
  (typeof FIRESTORE_DOCUMENT_TYPES)[keyof typeof FIRESTORE_DOCUMENT_TYPES];
