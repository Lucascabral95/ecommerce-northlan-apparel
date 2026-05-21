export type AppErrorOptions = Readonly<{
  cause?: unknown;
  details?: Record<string, unknown>;
}>;

export class AppError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly isOperational = true;

  constructor(code: string, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = options.details;

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class ValidationAppError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, { details });
  }
}

export class NotFoundAppError extends AppError {
  constructor(resourceName: string, details?: Record<string, unknown>) {
    super('NOT_FOUND', `${resourceName} was not found.`, { details });
  }
}

export class ConflictAppError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', message, { details });
  }
}

export class UnauthorizedAppError extends AppError {
  constructor(message = 'Authentication is required.') {
    super('UNAUTHORIZED', message);
  }
}

export class ForbiddenAppError extends AppError {
  constructor(message = 'The current principal is not allowed to perform this action.') {
    super('FORBIDDEN', message);
  }
}

export class InfrastructureAppError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('INFRASTRUCTURE_ERROR', message, { cause });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
