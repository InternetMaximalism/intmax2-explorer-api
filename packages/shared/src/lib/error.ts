import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { isProduction } from "../config";
import { getIP } from "./ip";
import { logger } from "./logger";

export enum ErrorCode {
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
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

export class BadRequestError extends AppError {
  constructor(message: string = "Bad request") {
    super(400, "BAD_REQUEST", message);
  }
}

export class UnAuthorizedError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(401, "UN_AUTHORIZED_ERROR", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(403, "FORBIDDEN", message);
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

const IP_LIMITED_PATHS = ["/v1/ip/block-check"];

export const handleError = (err: unknown, c: Context) => {
  if (err instanceof HTTPException) {
    return c.json({ code: `HTTP_${err.status}`, message: err.message }, err.status);
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: "Validation Error",
        errors: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
      },
      400,
    );
  }

  if (err instanceof ForbiddenError && IP_LIMITED_PATHS.includes(c.req.path)) {
    return c.json(
      {
        ip: getIP(c),
        blocked: true,
        reason: err.message,
      },
      200,
    );
  }

  if (err instanceof AppError) {
    return c.json({ code: err.code, message: err.message }, err.statusCode as ContentfulStatusCode);
  }

  logger.error("Unhandled error:", err);

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
