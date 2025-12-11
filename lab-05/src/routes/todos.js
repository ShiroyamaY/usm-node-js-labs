import express from 'express';
import {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo
} from '../controllers/todoController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createTodoValidation,
  todoIdParam,
  toggleIdParam,
  todoQueryValidation,
  updateTodoValidation
} from '../validators/todoValidators.js';

const router = express.Router();

/**
 * @swagger
 * /api/todos:
 *   get:
 *     summary: Get all todos with filtering, search and pagination
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title
 *       - in: query
 *         name: completed
 *         schema:
 *           type: boolean
 *         description: Filter by completion status
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, title, due_date]
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of todos with pagination
 */
router.get('/', authenticate, todoQueryValidation, validateRequest, getAllTodos);

/**
 * @swagger
 * /api/todos/{id}:
 *   get:
 *     summary: Get todo by ID
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Todo details
 *       404:
 *         description: Todo not found
 */
router.get('/:id', authenticate, todoIdParam, validateRequest, getTodoById);

/**
 * @swagger
 * /api/todos:
 *   post:
 *     summary: Create a new todo
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               category_id:
 *                 type: integer
 *               due_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Todo created
 */
router.post('/', authenticate, createTodoValidation, validateRequest, createTodo);

/**
 * @swagger
 * /api/todos/{id}:
 *   put:
 *     summary: Update todo
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               completed:
 *                 type: boolean
 *               category_id:
 *                 type: integer
 *               due_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Todo updated
 *       404:
 *         description: Todo not found
 */
router.put('/:id', authenticate, todoIdParam, updateTodoValidation, validateRequest, updateTodo);

/**
 * @swagger
 * /api/todos/{id}/toggle:
 *   patch:
 *     summary: Toggle todo completion status
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Todo status toggled
 *       404:
 *         description: Todo not found
 */
router.patch('/:id/toggle', authenticate, toggleIdParam, validateRequest, toggleTodo);

/**
 * @swagger
 * /api/todos/{id}:
 *   delete:
 *     summary: Delete todo
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Todo deleted
 *       404:
 *         description: Todo not found
 */
router.delete('/:id', authenticate, todoIdParam, validateRequest, deleteTodo);

export default router;
