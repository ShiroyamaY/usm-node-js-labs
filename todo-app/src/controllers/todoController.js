import Todo from '../models/todo.js'

export async function renderTodoList(req, res) {
  const status = req.query.status || 'all'
  const todos = await Todo.getTodosByStatus(status)
  res.render('index', { title: 'Список задач', todos, status })
}

export async function handleCreateTodo(req, res) {
  const title = (req.body.title || '').trim()
  if (!title) {
    return res.status(400).render('new', { title: 'Новая задача', error: 'Название не должно быть пустым', value: '' })
  }
  await Todo.createTodo(title)
  res.redirect('/')
}

export async function handleToggleTodo(req, res) {
  const { id } = req.params
  await Todo.toggleTodoById(id)
  res.redirect('back')
}

export async function handleDeleteTodo(req, res) {
  const { id } = req.params
  await Todo.deleteTodoById(id)
  res.redirect('back')
}

export async function renderNewTodoForm(req, res) {
  res.render('new', { title: 'Новая задача' })
}
