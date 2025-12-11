import db from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';

const { Category } = db;

export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({
    order: [['created_at', 'DESC']]
  });

  res.json({ categories });
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  res.json({ category });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const category = await Category.create({ name });

  res.status(201).json({
    message: 'Category created successfully',
    category
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const category = await Category.findByPk(req.params.id);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  await category.update({ name });

  res.json({
    message: 'Category updated successfully',
    category
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  await category.destroy();

  res.status(204).send();
});
