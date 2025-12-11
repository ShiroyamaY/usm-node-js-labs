export class ApiError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.name = options.name || new.target.name;
    this.statusCode = statusCode;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    this.shouldReport = options.shouldReport ?? statusCode >= 500;
  }
}

export class ValidationError extends ApiError {
  constructor(errors = []) {
    super('Validation failed', 400, {
      details: errors,
      shouldReport: false
    });
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404, { shouldReport: false });
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401, { shouldReport: false });
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied') {
    super(message, 403, { shouldReport: false });
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists', details) {
    super(message, 409, { shouldReport: false, details });
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Invalid data provided', details) {
    super(message, 400, { details, shouldReport: false });
  }
}

export class DatabaseError extends ApiError {
  constructor(message = 'Database error', details) {
    super(message, 500, { details });
  }
}

export const buildApiError = (error) => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error.name === 'SequelizeValidationError') {
    const details = error.errors?.map((e) => ({
      field: e.path,
      message: e.message
    }));
    return new ValidationError(details);
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const details = error.errors?.map((e) => ({
      field: e.path,
      message: e.message
    }));
    return new ConflictError('Duplicate data', details);
  }

  return new ApiError(error.message || 'Internal server error', error.statusCode || 500, {
    details: error.details,
    isOperational: false
  });
};
