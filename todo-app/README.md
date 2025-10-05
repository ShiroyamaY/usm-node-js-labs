# Лабораторная работа №1. Введение в Express.js. Создание простого приложения "ToDo List"

## Цель работы

> Понять базовую связку Express + MVC: контроллеры, роуты, представления.
> Научиться обрабатывать формы (GET/POST), передавать данные в шаблоны и делать > redirect после успешной отправки.
> Реализовать минимальное приложение без БД с хранением данных в памяти процесса.

## Условие

> Разработать приложение "ToDo List" с возможностью:
> Просмотра списка задач.
> Создания новой задачи.
> Переключения статуса задачи (выполнена/не выполнена).
> Удаления задачи.

## TodoApp

Простое приложение "ToDo List" на Express + MVC с Pug и SQLite. Данные хранятся в локальной базе SQLite, миграции выполняются автоматически при старте.

## Запуск

```bash
npm install
npm run dev
# или
npm start
```

Приложение по умолчанию доступно на `http://localhost:3000`.

## Переменные окружения (.env)

```
APP_NAME=TodoApp
PORT=3000
NODE_ENV=development
DATABASE_PATH=./data/todo.sqlite
```

## Структура

- `src/app.js` — настройка Express, middleware, статика, роуты, 404.
- `src/routes/index.js` — HTTP-маршруты.
- `src/controllers/*` — контроллеры (`todo`, `about`, `error`).
- `src/models/todo.js` — модель Todo (CRUD в SQLite).
- `src/db.js` — подключение к SQLite и миграции.
- `src/views/*.pug` — представления (layout, index, new, about, 404).
- `public/` — статические файлы.

## Объяснение кода

— Он инициализирует сервер, подключает middleware, статику, роуты и запускает приложение:
```js
runMigrations()

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, '..', 'public')))

app.use('/', routes)
app.use(renderNotFound)

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)
if (isMainModule) {
  const port = config.port
  app.listen(port, () => {
    console.log(`[${config.appName}] listening on http://localhost:${port}`)
  })
}

export default app
```

— Загружаем значения из `.env` предоставляющее конфигурацию для всего приложения:
```js
import 'dotenv/config'

const config = {
  appName: process.env.APP_NAME || 'TodoApp',
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || './data/todo.sqlite'
}

export default config
```

— создаём подключение к SQLite, обеспечиваем наличие директории и выполняем миграцию таблицы задач:
```js
const sqlite3 = sqlite3pkg.verbose()

const dbDirectory = path.dirname(config.databasePath)
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true })
}

export const db = new sqlite3.Database(config.databasePath)

export function runMigrations() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  })
}
```

— описываем все пользовательские маршруты и связываем их с контроллерами:
```js
const router = Router()

router.get('/', renderTodoList)
router.get('/new', renderNewTodoForm)
router.post('/new', handleCreateTodo)
router.post('/:id/toggle', handleToggleTodo)
router.post('/:id/delete', handleDeleteTodo)
router.get('/about', renderAboutPage)

export default router
```

— реализуем бизнес-логику задач: показывает список, создаёт, переключает и удаляет записи:
```js
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
```

— определяем модель работы с таблицей `todos` в SQLite с понятными методами:
```js
import { db } from '../db.js'

const Todo = {
  async getTodosByStatus(status) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM todos'
      const params = []
      if (status === 'active') {
        query += ' WHERE completed = 0'
      } else if (status === 'completed') {
        query += ' WHERE completed = 1'
      }
      query += ' ORDER BY id DESC'
      db.all(query, params, (err, rows) => {
        if (err) return reject(err)
        resolve(rows)
      })
    })
  },

  async createTodo(title) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO todos (title, completed) VALUES (?, 0)',
        [title],
        function (err) {
          if (err) return reject(err)
          resolve({ id: this.lastID, title, completed: 0 })
        }
      )
    })
  },

  async toggleTodoById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT completed FROM todos WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err)
        if (!row) return resolve(null)
        const newValue = row.completed ? 0 : 1
        db.run('UPDATE todos SET completed = ? WHERE id = ?', [newValue, id], function (err) {
          if (err) return reject(err)
          resolve(this.changes > 0)
        })
      })
    })
  },

  async deleteTodoById(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM todos WHERE id = ?', [id], function (err) {
        if (err) return reject(err)
        resolve(this.changes > 0)
      })
    })
  }
}

export default Todo
```

— задаём общий макет и базовую навигацию:
```pug
doctype html
html(lang="ru")
  head
    meta(charset="utf-8")
    meta(name="viewport" content="width=device-width, initial-scale=1")
    title #{title} | TodoApp
    link(rel="stylesheet" href="/css/styles.css")
  body
    header
      nav
        a(href="/") Список
        |  · 
        a(href="/new") Новая
        |  · 
        a(href="/about") О нас
    main
      block content
    footer
      small © #{new Date().getFullYear()} TodoApp
```

— Данный темплейт показывает список задач, позволяет фильтровать, переключать и удалять:
```pug
extends layout

block content
  h1 Список задач

  form(method="get" action="/")
    label(for="status") Фильтр:
    select(name="status" id="status" onchange="this.form.submit()")
      option(value="all" selected=status === 'all') Все
      option(value="active" selected=status === 'active') Активные
      option(value="completed" selected=status === 'completed') Выполненные

  if todos.length
    ul.todo-list
      each t in todos
        li(class=t.completed ? 'done' : '')
          form(method="post" action=`/${t.id}/toggle`)
            button(type="submit") #{t.completed ? '↩' : '✓'}
          span= t.title
          form(method="post" action=`/${t.id}/delete`)
            button(type="submit" class="danger") ×
  else
    p Нет задач.
    a(href="/new") Создать задачу
```

— Данный темплейт выводит форму создания новой задачи и показывает ошибку валидации:
```pug
extends layout

block content
  h1 Новая задача

  if typeof error !== 'undefined'
    p.error= error

  form(method="post" action="/new")
    input(type="text" name="title" placeholder="Что нужно сделать?" required value=(typeof value !== 'undefined' ? value : ''))
    button(type="submit") Добавить
```


## Контрольные вопросы

- Чем отличаются HTML-маршруты от REST API?
  
  - HTML-маршруты возвращают HTML-страницы через `res.render`, используются для серверного рендеринга. REST API возвращает данные (обычно JSON) через `res.json` и не отвечает за отрисовку.

- Что такое `res.render` и `res.json`? В каких случаях что использовать?
  
  - `res.render(view, data)` рендерит шаблон (Pug/EJS) в HTML. `res.json(data)` возвращает JSON-ответ. Для страниц — `render`, для API — `json`.

- Что такое middleware в Express и для чего используется `express.urlencoded`?
  
  - Middleware — функции-обработчики, через которые проходят запросы. `express.urlencoded` разбирает `application/x-www-form-urlencoded` (данные форм) и заполняет `req.body`.

## Примечания

- Для хранения используется SQLite файл по пути из `DATABASE_PATH`.
