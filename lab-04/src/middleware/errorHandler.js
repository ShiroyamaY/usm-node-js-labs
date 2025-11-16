import * as Sentry from '@sentry/node';
import logger from '../config/logger.js';
import { ValidationError, buildApiError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const error = buildApiError(err);

  logger.error(error.message, {
    statusCode: error.statusCode,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    details: error.details,
    stack: error.stack
  });

  if (Sentry.getClient() && error.shouldReport) {
    Sentry.captureException(error, {
      tags: {
        component: 'express',
        path: req.originalUrl,
        method: req.method
      },
      extra: {
        userId: req.user?.id,
        details: error.details
      }
    });
  }

  const response = {
    status: 'error',
    message: error.isOperational ? error.message : 'Internal server error'
  };

  if (error instanceof ValidationError || Array.isArray(error.details)) {
    response.errors = error.details;
  }

  res.status(error.statusCode).json(response);
};
