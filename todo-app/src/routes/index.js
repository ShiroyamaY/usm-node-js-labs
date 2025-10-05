import { Router } from 'express'
import { renderTodoList, renderNewTodoForm, handleCreateTodo, handleToggleTodo, handleDeleteTodo } from '../controllers/todoController.js'
import { renderAboutPage } from '../controllers/aboutController.js'

const router = Router()

router.get('/', renderTodoList)
router.get('/new', renderNewTodoForm)
router.post('/new', handleCreateTodo)
router.post('/:id/toggle', handleToggleTodo)
router.post('/:id/delete', handleDeleteTodo)
router.get('/about', renderAboutPage)

export default router
