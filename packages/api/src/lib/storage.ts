import { AsyncLocalStorage } from "async_hooks";
import type { AsyncLocalStorageStore } from "../types";

export const asyncLocalStorage = new AsyncLocalStorage<AsyncLocalStorageStore>();
