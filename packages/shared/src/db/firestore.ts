import { Firestore } from "@google-cloud/firestore";
import { config } from "../config";

export const db = new Firestore({
  projectId: config.GOOGLE_CLOUD_PROJECT,
  ignoreUndefinedProperties: true,
  databaseId: config.FIRESTORE_DATABASE_ID,
});
