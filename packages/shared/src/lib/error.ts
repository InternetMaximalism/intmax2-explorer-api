import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { isProduction } from "../config";
import { logger } from "./logger";

export enum ErrorCode {
  NOT_FOUND = "NOT_FOUND",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too many requests") {
    super(429, "TOO_MANY_REQUESTS", message);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(500, "INTERNAL_SERVER_ERROR", message);
  }
}

const IGNORE_ERROR_MESSAGES = ["URI malformed"];

export const handleError = (err: unknown, c: Context) => {
  if (err instanceof ZodError) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: "Validation Error",
        errors: err.issues.map((e) => ({ path: e.path.join("."), message: e.message })),
      },
      400,
    );
  }

  const shouldLogError =
    (err instanceof Error && !IGNORE_ERROR_MESSAGES.includes(err.message)) ||
    (!(err instanceof NotFoundError) && !(err instanceof TooManyRequestsError));

  if (shouldLogError) {
    logger.error(`Unhandled error: ${(err as Error).stack}`);
  }

  if (err instanceof AppError) {
    return c.json({ code: err.code, message: err.message }, err.statusCode as ContentfulStatusCode);
  }

  const statusCode = err instanceof Error ? 500 : 400;
  const code = err instanceof Error ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST";
  const message = err instanceof Error ? "Internal Server Error" : "Bad Request";

  return c.json(
    {
      code,
      message,
      ...(!isProduction && err instanceof Error && { stack: err.stack }),
    },
    statusCode,
  );
};
