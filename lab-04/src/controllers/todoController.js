import { Op } from 'sequelize';
import db from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';

const { Todo, Category, User } = db;

const ensureAccess = (todo, user) => {
  if (user.role !== 'admin' && todo.user_id !== user.id) {
    throw new ForbiddenError('You are not allowed to access this todo');
  }
};

export const getAllTodos = asyncHandler(async (req, res) => {
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
    where.completed = completed === 'true' || completed === true;
  }

  if (search) {
    where.title = { [Op.iLike]: `%${search}%` };
  }

  const allowedSortFields = ['created_at', 'updated_at', 'title', 'due_date'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
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
});

export const getTodoById = asyncHandler(async (req, res) => {
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
    throw new NotFoundError('Todo not found');
  }

  ensureAccess(todo, req.user);

  res.json({ todo });
});

export const createTodo = asyncHandler(async (req, res) => {
  const { title, category_id, due_date } = req.body;

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
});

export const updateTodo = asyncHandler(async (req, res) => {
  const { title, completed, category_id, due_date } = req.body;
  const todo = await Todo.findByPk(req.params.id);

  if (!todo) {
    throw new NotFoundError('Todo not found');
  }

  ensureAccess(todo, req.user);

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
});

export const toggleTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findByPk(req.params.id);

  if (!todo) {
    throw new NotFoundError('Todo not found');
  }

  ensureAccess(todo, req.user);

  await todo.update({ completed: !todo.completed });

  res.json({
    message: 'Todo status toggled',
    todo
  });
});

export const deleteTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findByPk(req.params.id);

  if (!todo) {
    throw new NotFoundError('Todo not found');
  }

  ensureAccess(todo, req.user);

  await todo.destroy();

  res.status(204).send();
});
