import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { isProduction } from "../config";
import { logger } from "./logger";

export enum ErrorCode {
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

interface HasStatus {
  status: number;
}

const hasStatus = (err: unknown): err is HasStatus => {
  return typeof err === "object" && err !== null && "status" in err;
};

const mapError = (status: ContentfulStatusCode, _: unknown) => {
  if (status === 504) {
    return {
      code: "GATEWAY_TIMEOUT",
      message: "Gateway Timeout",
    };
  }
  if (status >= 400 && status < 500) {
    return {
      code: "BAD_REQUEST",
      message: "Bad Request",
    };
  }

  return {
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
  };
};

const getStatus = (err: unknown): number => {
  if (hasStatus(err)) {
    return err.status;
  }
  return 500;
};

export const TIMEOUT_ERROR = new HTTPException(504, {
  message: "Request timed out",
});

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

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(401, "UNAUTHORIZED", message);
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

export class TimeoutError extends AppError {
  constructor(message: string = "Request timed out") {
    super(504, "TIMEOUT", message);
  }
}

const IGNORE_ERROR_MESSAGES = [
  "URI malformed",
  "Request timed out",
  "Response.clone: Body has already been consumed.",
];

export const handleError = (err: unknown, c: Context): Response => {
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
    err instanceof Error &&
    !IGNORE_ERROR_MESSAGES.includes(err.message) &&
    !(err instanceof NotFoundError) &&
    !(err instanceof TooManyRequestsError);

  if (shouldLogError) {
    logger.error(`Unhandled error: ${(err as Error).stack}`);
  }

  if (err instanceof AppError) {
    return c.json({ code: err.code, message: err.message }, err.statusCode as ContentfulStatusCode);
  }

  const statusCode = getStatus(err) as ContentfulStatusCode;
  const { code, message } = mapError(statusCode, err);

  return c.json(
    {
      code,
      message,
      ...(!isProduction && err instanceof Error && { stack: err.stack }),
    },
    statusCode,
  );
};
