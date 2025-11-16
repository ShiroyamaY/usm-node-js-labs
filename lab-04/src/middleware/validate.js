import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors.js';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new ValidationError(
        errors.array().map(({ msg, param }) => ({
          field: param,
          message: msg
        }))
      )
    );
  }

  return next();
};
