import { body, param } from 'express-validator';

export const categoryIdParam = [
  param('id').isInt({ gt: 0 }).withMessage('Category id must be a positive integer')
];

export const categoryBody = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters long')
];

export const categoryUpdateValidation = [...categoryIdParam, ...categoryBody];
