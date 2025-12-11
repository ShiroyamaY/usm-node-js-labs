import { GraphQLError } from 'graphql';
import { Op } from 'sequelize';
import db from '../models/index.js';
import logger from '../config/logger.js';

const { Todo, Category } = db;

const unauthorizedError = () =>
  new GraphQLError('Authentication required', {
    extensions: { code: 'UNAUTHENTICATED', statusCode: 401 }
  });

const forbiddenError = () =>
  new GraphQLError('Access denied', {
    extensions: { code: 'FORBIDDEN', statusCode: 403 }
  });

const notFoundError = (message) =>
  new GraphQLError(message, {
    extensions: { code: 'NOT_FOUND', statusCode: 404 }
  });

const badRequestError = (message, details) =>
  new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT', statusCode: 400, details }
  });

const requireAuth = (context) => {
  if (!context?.user) {
    throw unauthorizedError();
  }

  return context.user;
};

const ensureTodoAccess = (todo, user) => {
  if (user.role !== 'admin' && todo.user_id !== user.id) {
    throw forbiddenError();
  }
};

const validateTodoInput = (input, { partial = false } = {}) => {
  if (!input || typeof input !== 'object') {
    throw badRequestError('Input payload is required');
  }

  const { title, category_id, due_date, completed } = input;
  const payload = {};

  if (!partial || title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      throw badRequestError('Title is required');
    }

    const trimmed = title.trim();
    if (trimmed.length < 2 || trimmed.length > 120) {
      throw badRequestError('Title must be between 2 and 120 characters');
    }
    payload.title = trimmed;
  }

  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      throw badRequestError('Completed must be a boolean');
    }
    payload.completed = completed;
  }

  if (category_id !== undefined) {
    if (category_id === null) {
      payload.category_id = null;
    } else if (!Number.isInteger(category_id) || category_id <= 0) {
      throw badRequestError('category_id must be a positive integer');
    } else {
      payload.category_id = category_id;
    }
  }

  if (due_date !== undefined) {
    if (due_date === null) {
      payload.due_date = null;
    } else if (Number.isNaN(Date.parse(due_date))) {
      throw badRequestError('due_date must be a valid ISO 8601 date string');
    } else {
      payload.due_date = new Date(due_date);
    }
  }

  if (partial && Object.keys(payload).length === 0) {
    throw badRequestError('Provide at least one field to update');
  }

  return payload;
};

const parseListArgs = (args) => {
  const {
    category,
    completed,
    search,
    sort = 'created_at',
    order = 'desc',
    page = 1,
    limit = 10
  } = args || {};

  const where = {};

  if (category !== undefined && category !== null) {
    if (!Number.isInteger(category) || category <= 0) {
      throw badRequestError('category must be a positive integer');
    }
    where.category_id = category;
  }

  if (completed !== undefined && completed !== null) {
    if (typeof completed !== 'boolean') {
      throw badRequestError('completed must be a boolean');
    }
    where.completed = completed;
  }

  if (search) {
    where.title = { [Op.iLike]: `%${search}%` };
  }

  const allowedSortFields = ['created_at', 'updated_at', 'title', 'due_date'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
  const sortOrder = order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const pageNum = Number.isInteger(page) && page > 0 ? page : 1;
  const limitNum = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 10;

  return { where, sortField, sortOrder, pageNum, limitNum };
};

const includeRelations = [
  { model: Category, as: 'category', attributes: ['id', 'name'] },
  { model: db.User, as: 'user', attributes: ['id', 'username', 'email', 'role'] }
];

const serializeTodo = (todo) => todo?.get({ plain: true });

const resolvers = {
  me: (args, context) => {
    const user = requireAuth(context);
    return user.get({ plain: true });
  },

  categories: async (args, context) => {
    requireAuth(context);
    const categories = await Category.findAll({ order: [['created_at', 'DESC']] });
    return categories.map((c) => c.get({ plain: true }));
  },

  todos: async (args, context) => {
    const user = requireAuth(context);
    const { where, sortField, sortOrder, pageNum, limitNum } = parseListArgs(args);

    if (user.role !== 'admin') {
      where.user_id = user.id;
    }

    const offset = (pageNum - 1) * limitNum;
    const { count, rows } = await Todo.findAndCountAll({
      where,
      include: includeRelations,
      order: [[sortField, sortOrder]],
      limit: limitNum,
      offset
    });

    const totalPages = Math.ceil(count / limitNum) || 1;

    return {
      data: rows.map(serializeTodo),
      meta: {
        total: count,
        count: rows.length,
        limit: limitNum,
        pages: totalPages,
        currentPage: pageNum
      }
    };
  },

  todo: async ({ id }, context) => {
    const user = requireAuth(context);
    const todo = await Todo.findByPk(id, { include: includeRelations });

    if (!todo) {
      throw notFoundError('Todo not found');
    }

    ensureTodoAccess(todo, user);

    return serializeTodo(todo);
  },

  addTodo: async ({ input }, context) => {
    const user = requireAuth(context);
    const payload = validateTodoInput(input);

    if (payload.category_id) {
      const category = await Category.findByPk(payload.category_id);
      if (!category) {
        throw badRequestError('Category does not exist');
      }
    }

    const todo = await Todo.create({
      ...payload,
      user_id: user.id
    });

    const created = await Todo.findByPk(todo.id, { include: includeRelations });
    logger.info('Todo created via GraphQL', { todoId: todo.id, userId: user.id });

    return serializeTodo(created);
  },

  updateTodo: async ({ id, input }, context) => {
    const user = requireAuth(context);
    const todo = await Todo.findByPk(id);

    if (!todo) {
      throw notFoundError('Todo not found');
    }

    ensureTodoAccess(todo, user);
    const payload = validateTodoInput(input, { partial: true });

    if (payload.category_id !== undefined && payload.category_id !== null) {
      const category = await Category.findByPk(payload.category_id);
      if (!category) {
        throw badRequestError('Category does not exist');
      }
    }

    await todo.update(payload);
    const updated = await Todo.findByPk(id, { include: includeRelations });

    logger.info('Todo updated via GraphQL', { todoId: id, userId: user.id });
    return serializeTodo(updated);
  },

  toggleTodo: async ({ id }, context) => {
    const user = requireAuth(context);
    const todo = await Todo.findByPk(id);

    if (!todo) {
      throw notFoundError('Todo not found');
    }

    ensureTodoAccess(todo, user);
    await todo.update({ completed: !todo.completed });

    const toggled = await Todo.findByPk(id, { include: includeRelations });

    logger.info('Todo toggled via GraphQL', { todoId: id, userId: user.id });
    return serializeTodo(toggled);
  }
};

export default resolvers;
