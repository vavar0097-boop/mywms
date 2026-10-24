export class AppError extends Error {
public readonly statusCode: number;

constructor(
message: string,
statusCode = 500
) {
super(message);


this.statusCode = statusCode;

Error.captureStackTrace(
  this,
  this.constructor
);


}
}

export class BadRequestError extends AppError {
constructor(message: string) {
super(message, 400);
}
}

export class UnauthorizedError extends AppError {
constructor(message = "Unauthorized") {
super(message, 401);
}
}

export class ForbiddenError extends AppError {
constructor(message = "Forbidden") {
super(message, 403);
}
}

export class NotFoundError extends AppError {
constructor(message = "Not Found") {
super(message, 404);
}
}

export class ConflictError extends AppError {
constructor(message = "Conflict") {
super(message, 409);
}
}

/**
 * Postgres/PostgREST reports a foreign key violation as error code
 * "23503" when a row can't be deleted because other rows still
 * reference it (e.g. deleting a warehouse that still has locations,
 * or a vendor still referenced by purchase orders). Without this
 * check, that error bubbles up as an unhandled 500 with a raw
 * database message instead of a clear, actionable one.
 */
export function isForeignKeyViolation(
  error: unknown
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23503"
  );
}

export function toDeleteConflictError(
  error: unknown,
  entityLabel: string
): ConflictError {
  return new ConflictError(
    `Cannot delete this ${entityLabel} because it is still referenced by other records (e.g. locations, stock, or transactions). Deactivate it instead.`
  );
}
