# Лабораторная работа №5. GraphQL для TODO API

## Цель и что сделано
- Добавлен GraphQL поверх существующего REST TODO-сервиса (Express + PostgreSQL + Sequelize).
- Новый endpoint `/graphql` с GraphiQL и редактором заголовков; REST (`/api/auth`, `/api/categories`, `/api/todos`) работает как раньше.
- Авторизация та же: JWT через `Authorization: Bearer <token>`, роли `user`/`admin` сохранены.
- Валидация на стороне GraphQL: длина title, boolean completed, ISO8601 для due_date, проверка category_id, обязательность полей на create/update.
- Ошибки возвращают коды (`UNAUTHENTICATED`, `FORBIDDEN`, `BAD_USER_INPUT`, `NOT_FOUND`) и корректные HTTP-статусы 401/403/400/404/500; логирование Winston, Sentry по DSN.

## Почему GraphQL
- Нужно за один запрос получать todo + категорию + пользователя и настраивать поля без новых REST-ручек.
- Меньше over/under-fetching и HTTP-запросов на клиенте.
- Удобная само-документация и тестирование через GraphiQL.

## Стек
- Node.js, Express, express-graphql, graphql.
- Sequelize + PostgreSQL (миграции/seed, модели User/Category/Todo).
- JWT аутентификация и роли `user`/`admin`.
- Winston + winston-daily-rotate-file, morgan; Sentry опционально.

## Структура GraphQL
- Типы: `User`, `Category`, `Todo`, `PaginationMeta`, `TodosPage`.
- Входные типы: `TodoInput`, `TodoUpdateInput`.
- Query: `me`, `categories`, `todos(...)`, `todo(id)`.
- Mutation: `addTodo(input)`, `updateTodo(id, input)`, `toggleTodo(id)`.
- Доступ: user — только свои задачи; admin — все.

## Запуск
1) Заполнить `.env` (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET, JWT_EXPIRE, SENTRY_DSN?, LOG_LEVEL).
2) Установить зависимости:
   ```bash
   cd lab-05
   npm install
   ```
3) Миграции и сиды при пустой БД:
   ```bash
   npm run migrate
   npm run seed
   ```
   Есть пользователи: admin/admin@example.com (`Admin123!`), johndoe/john.doe@example.com (`User123!`).
4) Запуск:
   ```bash
   npm run dev   # или npm start
   ```
5) Точки входа: Swagger `/api-docs`, GraphQL `/graphql` (в dev открыт GraphiQL c вкладкой Headers).

## Как получить токен
1) `POST /api/auth/login` с телом `{ "email": "admin@example.com", "password": "Admin123!" }` (или свой пользователь).
2) В ответе поле `token`. В GraphiQL на вкладке Headers вписать:
   ```json
   { "Authorization": "Bearer <token>" }
   ```

## Примеры GraphQL-запросов
Текущий пользователь:
```graphql
query Me {
  me { id username email role }
}
```

Список задач с фильтрами и пагинацией:
```graphql
query Todos {
  todos(category: 1, completed: false, page: 1, limit: 5, sort: "due_date", order: "asc") {
    data {
      id
      title
      completed
      due_date
      category { id name }
      user { id username email }
    }
    meta { total count pages currentPage }
  }
}
```

Создать задачу:
```graphql
mutation CreateTodo {
  addTodo(input: { title: "GraphQL задача", category_id: 1, due_date: "2025-12-31T12:00:00.000Z" }) {
    id
    title
    completed
    category { id name }
  }
}
```

Обновить и переключить статус:
```graphql
mutation UpdateTodo($id: ID!) {
  updateTodo(id: $id, input: { title: "Новый заголовок", completed: true }) {
    id
    title
    completed
  }
}

mutation Toggle($id: ID!) {
  toggleTodo(id: $id) { id completed }
}
```

## Обработка ошибок
- Нет/невалидный токен: `UNAUTHENTICATED` (HTTP 401).
- Нет прав на чужую задачу: `FORBIDDEN` (HTTP 403).
- Неверные входные данные: `BAD_USER_INPUT` (HTTP 400, детали в extensions.details при наличии).
- Не найдено: `NOT_FOUND` (HTTP 404).
- Остальное: `INTERNAL_SERVER_ERROR` (HTTP 500, пишется в Winston, Sentry при DSN).

## Итоги и ответы на контрольные вопросы
- REST vs GraphQL: один endpoint и выбор полей/связей вместо фиксированных ресурсов; меньше over/under-fetching; REST проще кешировать на уровне HTTP/CDN.
- Когда лучше GraphQL: объединять несколько сущностей за один запрос, гибко выбирать поля, быстро эволюционировать фронт без новых ручек, снижать число HTTP-вызовов.
- Ограничения GraphQL: сложнее кеширование по HTTP, нужен контроль тяжёлых запросов, обязательна схема и серверная валидация, чуть сложнее мониторинг.
- Интеграция: `/graphql` использует те же модели Sequelize, JWT и роли, что REST; логирование Winston, Sentry опционально; миграции/seed прежние.

## Мои выводы и ход выполнения
- Я выбрал GraphQL, чтобы за один запрос получать todo + категорию + пользователя и не плодить REST-ручки. Это убрало over/under-fetching и упростило клиент.
- Настроил `/graphql` в `src/app.js`, включил GraphiQL с header editor, чтобы удобно передавать `Authorization: Bearer <token>`.
- В контексте (`src/graphql/context.js`) парсю JWT из заголовка и кладу пользователя в `context.user`; без токена резолверы возвращают `UNAUTHENTICATED` и отдают 401.
- В резолверах (`src/graphql/resolvers.js`) добавил валидацию, проверки доступа (user свои задачи, admin все) и работу через модели Sequelize.
- В `src/graphql/index.js` мапплю коды ошибок на HTTP-статусы, чтобы клиент сразу видел 401/403/400/404 вместо общего 500.

### Примеры кода
Подключение GraphQL с GraphiQL и статусами:
```js
// src/graphql/index.js
const graphqlMiddleware = graphqlHTTP(async (req, res) => ({
  schema,
  rootValue: resolvers,
  context: await buildContext(req),
  graphiql: process.env.NODE_ENV !== 'production'
    ? { headerEditorEnabled: true }
    : false,
  customFormatErrorFn: (error) => {
    const code = error.extensions?.code || 'INTERNAL_SERVER_ERROR';
    const status = mapStatus(code, error.originalError?.statusCode);
    if (!res.headersSent) res.status(status);
    return { message: error.message, code, status, path: error.path };
  }
}));
```

Контекст с JWT:
```js
// src/graphql/context.js
export const buildContext = async (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return { user: null };
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    return { user: user || null };
  } catch {
    return { user: null };
  }
};
```

Фрагмент резолверов с проверкой доступа:
```js
// src/graphql/resolvers.js
const requireAuth = (context) => {
  if (!context?.user) throw unauthorizedError();
  return context.user;
};

const resolvers = {
  me: (args, context) => requireAuth(context).get({ plain: true }),
  addTodo: async ({ input }, context) => {
    const user = requireAuth(context);
    const payload = validateTodoInput(input);
    if (payload.category_id) {
      const category = await Category.findByPk(payload.category_id);
      if (!category) throw badRequestError('Category does not exist');
    }
    const todo = await Todo.create({ ...payload, user_id: user.id });
    return (await Todo.findByPk(todo.id, { include: includeRelations })).get({ plain: true });
  }
};
```

### Что сделал по шагам
1) Добавил зависимости `express-graphql` и `graphql`, подключил `/graphql` и GraphiQL с header editor.
2) Описал схему (типы User/Category/Todo; Query: me/categories/todos/todo; Mutation: addTodo/updateTodo/toggleTodo).
3) Реализовал контекст с JWT и резолверы с валидацией и проверками ролей.
4) Настроил маппинг ошибок на HTTP-статусы и логирование Winston.
5) Обновил README с примерами запросов и инструкциями по получению токена через REST `/api/auth/login`.


### Примеры кода
Подключение GraphQL с GraphiQL и статусами:
```js
const graphqlMiddleware = graphqlHTTP(async (req, res) => ({
  schema,
  rootValue: resolvers,
  context: await buildContext(req),
  graphiql: process.env.NODE_ENV !== 'production'
    ? { headerEditorEnabled: true }
    : false,
  customFormatErrorFn: (error) => {
    const code =
      error.originalError?.extensions?.code ||
      error.extensions?.code ||
      (error.message === 'Authentication required' ? 'UNAUTHENTICATED' : 'INTERNAL_SERVER_ERROR');
    const status =
      error.originalError?.extensions?.statusCode ||
      error.extensions?.statusCode ||
      mapStatus(code, error.originalError?.statusCode);
    if (!res.headersSent) res.status(status);
    return { message: error.message, code, status, path: error.path };
  }
}));
```

Контекст с JWT:
```js
export const buildContext = async (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return { user: null };
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    return { user: user || null };
  } catch {
    return { user: null };
  }
};
```

Фрагмент резолверов:
```js
const requireAuth = (context) => {
  if (!context?.user) throw unauthorizedError();
  return context.user;
};

const resolvers = {
  me: (args, context) => requireAuth(context).get({ plain: true }),
  addTodo: async ({ input }, context) => {
    const user = requireAuth(context);
    const payload = validateTodoInput(input);
    if (payload.category_id) {
      const category = await Category.findByPk(payload.category_id);
      if (!category) throw badRequestError('Category does not exist');
    }
    const todo = await Todo.create({ ...payload, user_id: user.id });
    return (await Todo.findByPk(todo.id, { include: includeRelations })).get({ plain: true });
  }
};
```

### Что сделал по шагам
1) Добавил `express-graphql` и `graphql`, подключил `/graphql` и GraphiQL с header editor.
2) Описал схему (User/Category/Todo; Query: me/categories/todos/todo; Mutation: addTodo/updateTodo/toggleTodo).
3) Реализовал контекст с JWT и резолверы с валидацией и проверками ролей.
4) Настроил маппинг ошибок на HTTP-статусы и логирование Winston (5xx).
5) Обновил README с примерами запросов и инструкциями по получению токена через `/api/auth/login`.

## Мои выводы и ход выполнения
- Я выбрал GraphQL, чтобы за один запрос получать todo + категорию + пользователя без множества REST-ручек; так избежал over/under-fetching и упростил клиент.
- Поднял `/graphql` в `src/app.js`, включил GraphiQL с редактором заголовков, чтобы можно было добавлять `Authorization: Bearer <token>` прямо в UI.
- В контексте (`src/graphql/context.js`) разбираю JWT и кладу пользователя в `context.user`; без токена резолверы возвращают `UNAUTHENTICATED` и теперь отдают 401.
- В резолверах (`src/graphql/resolvers.js`) добавил валидацию входа и проверки доступа: user видит свои задачи, admin — все. На create/update проверяю длину title, тип completed, ISO8601 для due_date, существование category_id.
- В `src/graphql/index.js` мапплю коды ошибок на статусы (401/403/400/404/500) и логирую только 5xx через Winston; Sentry можно включить через DSN.