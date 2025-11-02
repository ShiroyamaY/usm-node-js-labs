import db from '../models/index.js';

const { Category } = db;

export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['created_at', 'DESC']]
    });

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await Category.create({ name });

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await category.update({ name });

    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await category.destroy();

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};