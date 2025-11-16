import { body, param, query } from 'express-validator';

export const todoIdParam = [param('id').isUUID().withMessage('Todo id must be a valid UUID')];

export const toggleIdParam = [
  param('id').isUUID().withMessage('Todo id for toggle must be a valid UUID')
];

export const createTodoValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Title must be between 2 and 120 characters long'),
  body('category_id')
    .optional({ nullable: true })
    .isInt({ gt: 0 })
    .withMessage('Category id must be a positive integer'),
  body('due_date')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Due date must follow ISO 8601 format')
];

export const updateTodoValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Title must be between 2 and 120 characters long'),
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed must be a boolean value'),
  body('category_id')
    .optional({ nullable: true })
    .isInt({ gt: 0 })
    .withMessage('Category id must be a positive integer'),
  body('due_date')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Due date must follow ISO 8601 format')
];

export const todoQueryValidation = [
  query('category')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('category must be a positive integer')
    .toInt(),
  query('completed')
    .optional()
    .isBoolean()
    .withMessage('completed must be a boolean')
    .toBoolean(),
  query('sort')
    .optional()
    .isIn(['created_at', 'updated_at', 'title', 'due_date'])
    .withMessage('sort must be one of: created_at, updated_at, title, due_date'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('order must be asc or desc'),
  query('page')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ gt: 0, lt: 101 })
    .withMessage('limit must be between 1 and 100')
    .toInt()
];
