import { Op } from 'sequelize';
import db from '../models/index.js';

const { Todo, Category, User } = db;

export const getAllTodos = async (req, res) => {
  try {
    const {
      category,
      search,
      sort = 'created_at',
      order = 'desc',
      page = 1,
      limit = 10,
      completed
    } = req.query;

    const where = {};

    if (req.user.role !== 'admin') {
      where.user_id = req.user.id;
    }

    if (category) {
      where.category_id = category;
    }

    if (completed !== undefined) {
      where.completed = completed === 'true';
    }

    if (search) {
      where.title = { [Op.iLike]: `%${search}%` };
    }

    const allowedSortFields = ['created_at', 'updated_at', 'title', 'due_date'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows: todos } = await Todo.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [[sortField, sortOrder]],
      limit: limitNum,
      offset
    });

    const totalPages = Math.ceil(count / limitNum);

    res.json({
      data: todos,
      meta: {
        total: count,
        count: todos.length,
        limit: limitNum,
        pages: totalPages,
        currentPage: pageNum
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTodoById = async (req, res) => {
  try {
    const todo = await Todo.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    if (req.user.role !== 'admin' && todo.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ todo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createTodo = async (req, res) => {
  try {
    const { title, category_id, due_date } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const todo = await Todo.create({
      title,
      category_id: category_id || null,
      due_date: due_date || null,
      user_id: req.user.id
    });

    const todoWithCategory = await Todo.findByPk(todo.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      message: 'Todo created successfully',
      todo: todoWithCategory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTodo = async (req, res) => {
  try {
    const { title, completed, category_id, due_date } = req.body;
    const todo = await Todo.findByPk(req.params.id);

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    if (req.user.role !== 'admin' && todo.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await todo.update({
      title: title !== undefined ? title : todo.title,
      completed: completed !== undefined ? completed : todo.completed,
      category_id: category_id !== undefined ? category_id : todo.category_id,
      due_date: due_date !== undefined ? due_date : todo.due_date
    });

    const updatedTodo = await Todo.findByPk(todo.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      message: 'Todo updated successfully',
      todo: updatedTodo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleTodo = async (req, res) => {
  try {
    const todo = await Todo.findByPk(req.params.id);

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    if (req.user.role !== 'admin' && todo.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await todo.update({ completed: !todo.completed });

    res.json({
      message: 'Todo status toggled',
      todo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTodo = async (req, res) => {
  try {
    const todo = await Todo.findByPk(req.params.id);

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    if (req.user.role !== 'admin' && todo.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await todo.destroy();

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};