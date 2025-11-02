# Лабораторная работа №2. Работа с базой данных

## Описание работы

В этой лабораторной я создал REST API для управления задачами (todo list) с использованием Node.js, Express и PostgreSQL. Основная цель - научиться работать с реляционными базами данных, создавать связи между таблицами и реализовать полноценный CRUD для нескольких сущностей.

## Цель работы

- Спроектировать и реализовать REST API с несколькими связанными сущностями
- Освоить работу с PostgreSQL через ORM Sequelize
- Реализовать фильтрацию, сортировку и пагинацию
- Понять принципы работы связей "один ко многим" (1:N) в реляционных БД
- Задокументировать API с помощью Swagger

## Технологии

- **Node.js** - серверная платформа
- **Express** - веб-фреймворк
- **PostgreSQL** - реляционная база данных
- **Sequelize** - ORM для работы с БД
- **Swagger** - документация API

## Структура проекта

```
todo-api/
├── src/
│   ├── config/           
│   ├── models/          
│   ├── controllers/     
│   ├── routes/          
│   ├── middleware/      
│   ├── migrations/      
│   └── app.js           
├── .env
├── package.json
└── README.md
```

## Установка и запуск

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd todo-api
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка базы данных

Создайте PostgreSQL базу данных и настройте `.env` файл:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=todo_db
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
```

### 4. Запуск миграций

```bash
npm run migrate
```

### 5. Запуск сервера

```bash
npm run dev
```

Сервер запустится на `http://localhost:3000`

Swagger документация доступна по адресу: `http://localhost:3000/api-docs`

## Практическая часть

### Шаг 1. Создание базы данных

Я создал три таблицы используя миграции Sequelize:

#### Таблица categories

```javascript
await queryInterface.createTable('categories', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING(100),
    allowNull: false
  },
  created_at: { type: Sequelize.DATE },
  updated_at: { type: Sequelize.DATE }
});
```

Эта таблица хранит категории задач. Каждая категория имеет уникальный `id` и `name`.

#### Таблица todos

```javascript
await queryInterface.createTable('todos', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  title: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  completed: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  category_id: {
    type: Sequelize.INTEGER,
    references: { model: 'categories', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  due_date: { type: Sequelize.DATE },
  created_at: { type: Sequelize.DATE },
  updated_at: { type: Sequelize.DATE }
});
```

Здесь я использовал UUID вместо обычного INTEGER для `id` - это более безопасный подход, так как UUID невозможно предсказать. Поле `category_id` - это внешний ключ на таблицу `categories`, причем при удалении категории он становится NULL (`onDelete: 'SET NULL'`).

### Шаг 2. Создание моделей

#### Модель Category

```javascript
export default (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    }
  }, {
    tableName: 'categories',
    underscored: true,
    timestamps: true
  });

  return Category;
};
```

Здесь я добавил валидацию на уровне модели - название категории должно быть от 2 до 100 символов. Опция `underscored: true` говорит Sequelize использовать snake_case для полей (например, `created_at` вместо `createdAt`).

#### Модель Todo

```javascript
export default (sequelize, DataTypes) => {
  const Todo = sequelize.define('Todo', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 120]
      }
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'todos',
    underscored: true,
    timestamps: true
  });

  return Todo;
};
```

Валидация заголовка - от 2 до 120 символов. По умолчанию задача не выполнена (`completed: false`).

#### Установка связей

В файле `models/index.js` я настроил связи между моделями:

```javascript
db.Category.hasMany(db.Todo, { foreignKey: 'category_id', as: 'todos' });
db.Todo.belongsTo(db.Category, { foreignKey: 'category_id', as: 'category' });
```

Это создает связь "один ко многим" - одна категория может иметь множество задач. Благодаря этому я могу получать связанные данные одним запросом:

```javascript
const todo = await Todo.findByPk(id, {
  include: [{ model: Category, as: 'category' }]
});
```

### Шаг 3. Реализация API

#### API для категорий

```javascript
export const getAllCategories = async (req, res) => {
  const categories = await Category.findAll({
    order: [['created_at', 'DESC']]
  });
  res.json({ categories });
};

export const createCategory = async (req, res) => {
  const { name } = req.body;
  const category = await Category.create({ name });
  res.status(201).json({ message: 'Category created', category });
};
```

Реализовал все стандартные CRUD операции - создание, чтение, обновление и удаление.

#### API для задач

```javascript
export const getAllTodos = async (req, res) => {
  const { category, search, sort, order, page, limit } = req.query;
  
  const where = {};
  
  if (category) where.category_id = category;
  if (search) where.title = { [Op.iLike]: `%${search}%` };
  
  const { count, rows: todos } = await Todo.findAndCountAll({
    where,
    include: [{ model: Category, as: 'category' }],
    order: [[sort || 'created_at', order || 'DESC']],
    limit: parseInt(limit) || 10,
    offset: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 10)
  });
  
  res.json({ data: todos, meta: { total: count, ... } });
};
```

Здесь самое интересное - реализация фильтрации, поиска и пагинации.

### Шаг 4. Фильтрация, поиск и пагинация

#### Фильтрация по категории

```javascript
if (category) {
  where.category_id = category;
}
```

Можно получить задачи конкретной категории: `GET /api/todos?category=3`

#### Поиск по заголовку

```javascript
if (search) {
  where.title = { [Op.iLike]: `%${search}%` };
}
```

Использую `iLike` для поиска без учета регистра. Запрос `GET /api/todos?search=купить` найдет "Купить молоко", "КУПИТЬ хлеб" и т.д.

#### Сортировка

```javascript
const allowedSortFields = ['created_at', 'updated_at', 'title', 'due_date'];
const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

order: [[sortField, sortOrder]]
```

Можно сортировать по разным полям: `GET /api/todos?sort=title&order=asc`

#### Пагинация

```javascript
const pageNum = parseInt(page) || 1;
const limitNum = parseInt(limit) || 10;
const offset = (pageNum - 1) * limitNum;

const { count, rows: todos } = await Todo.findAndCountAll({
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
```

Используя `findAndCountAll` я получаю и данные, и их общее количество. Это позволяет посчитать сколько всего страниц. Запрос `GET /api/todos?page=2&limit=5` вернет 5 задач со второй страницы.

### Swagger документация

Я задокументировал все эндпоинты с помощью JSDoc комментариев:

```javascript
/**
 * @swagger
 * /api/todos:
 *   get:
 *     summary: Get all todos with filtering
 *     tags: [Todos]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of todos
 */
```

После запуска сервера можно открыть `http://localhost:3000/api-docs` и увидеть интерактивную документацию, где можно даже тестировать запросы прямо из браузера.

## Примеры использования API

### Создание категории

```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Покупки"}'
```

### Создание задачи

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Купить молоко",
    "category_id": 1,
    "due_date": "2024-12-31T23:59:59Z"
  }'
```

### Получение задач с фильтрацией

```bash
curl "http://localhost:3000/api/todos?category=1"

curl "http://localhost:3000/api/todos?search=молоко"

curl "http://localhost:3000/api/todos?page=2&limit=5"

curl "http://localhost:3000/api/todos?sort=created_at&order=desc"
```

### Переключение статуса задачи

```bash
curl -X PATCH http://localhost:3000/api/todos/{id}/toggle
```

## Контрольные вопросы

**1. Что такое реляционная база данных и какие преимущества она предоставляет?**

Реляционная база данных - это БД, где данные хранятся в виде таблиц со строгой структурой. Каждая таблица имеет определенные столбцы с типами данных, а строки - это записи.

Основные преимущества:
- **Структурированность** - данные организованы логично, есть четкая схема
- **Связи между данными** - можно связывать таблицы через внешние ключи (foreign keys)
- **ACID транзакции** - гарантия целостности данных даже при сбоях
- **SQL язык** - мощный стандартизированный язык запросов
- **Нормализация** - можно избежать дублирования данных

В моем проекте я использовал связь между `categories` и `todos` - это позволило избежать хранения названия категории в каждой задаче.

**2. Какие типы связей между таблицами существуют в реляционных базах данных?**

Есть три основных типа:

- **Один к одному (1:1)** - каждая запись в таблице A связана максимум с одной записью в таблице B. Пример: пользователь и его профиль.

- **Один ко многим (1:N)** - одна запись в таблице A может быть связана со многими записями в таблице B. Это самый распространенный тип связи. В моем проекте одна категория может иметь много задач.

- **Многие ко многим (M:N)** - записи из таблицы A могут быть связаны со многими записями из таблицы B и наоборот. Для реализации нужна промежуточная таблица. Пример: студенты и курсы - один студент может посещать много курсов, и на одном курсе может быть много студентов.

**3. Что такое RESTful API и для чего он используется?**

REST (Representational State Transfer) - это архитектурный стиль для создания веб-сервисов. RESTful API - это API, которое следует принципам REST.

Основные принципы:
- Использование HTTP методов по назначению: GET (читать), POST (создать), PUT (обновить), DELETE (удалить)
- Ресурсы идентифицируются через URL: `/api/todos`, `/api/todos/123`
- Stateless - каждый запрос независим
- Возврат данных в удобном формате (обычно JSON)

REST удобен тем, что он понятный и стандартизированный. Любой разработчик сразу поймет что делает запрос `DELETE /api/todos/123`.

**4. Что такое SQL-инъекция и как защититься от неё?**

SQL-инъекция - это атака, когда злоумышленник вставляет вредоносный SQL код через пользовательский ввод.

Например, если делать запрос так:
```javascript
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
```

И пользователь введет: `' OR '1'='1`, то получится:
```sql
SELECT * FROM users WHERE email = '' OR '1'='1'
```

Это вернет всех пользователей, потому что `'1'='1'` всегда true.

**Защита:**
- Использовать параметризованные запросы или ORM (как Sequelize)
- ORM автоматически экранирует опасные символы
- Валидировать пользовательский ввод
- Применять принцип наименьших привилегий для БД пользователя

В моем проекте я использую Sequelize, поэтому защищен автоматически:
```javascript
where: { title: { [Op.iLike]: `%${search}%` } }
```

Sequelize безопасно подставит значение `search` в запрос.

**5. В чем разница между ORM и сырыми SQL-запросами? Какие преимущества и недостатки у каждого подхода?**

**ORM (Object-Relational Mapping)** - это библиотека, которая позволяет работать с БД через объекты в коде:

```javascript
const todo = await Todo.findByPk(id);
await todo.update({ completed: true });
```

**Сырой SQL:**
```javascript
const result = await db.query('SELECT * FROM todos WHERE id = $1', [id]);
const todo = result.rows[0];
await db.query('UPDATE todos SET completed = true WHERE id = $1', [id]);
```

**Преимущества ORM:**
- Проще писать - работаешь с привычными объектами
- Защита от SQL-инъекций из коробки
- Можно легко сменить БД (с PostgreSQL на MySQL)
- Валидация и хуки на уровне модели
- Автоматические связи между моделями

**Недостатки ORM:**
- Медленнее чем сырой SQL для сложных запросов
- Может генерировать неоптимальные запросы
- Иногда нужно знать SQL чтобы понять что происходит
- Дополнительный слой абстракции

**Преимущества сырого SQL:**
- Максимальная производительность
- Полный контроль над запросом
- Можно использовать специфичные фичи конкретной БД

**Недостатки сырого SQL:**
- Больше кода
- Нужно самому думать о безопасности
- Сложнее поддерживать

Я выбрал Sequelize потому что для учебного проекта важнее скорость разработки и безопасность. Для production можно комбинировать - ORM для простых операций, сырой SQL для сложных аналитических запросов.

## Выводы

В ходе работы я создал полноценный REST API для управления задачами. Разобрался с Sequelize ORM - как создавать модели, миграции, устанавливать связи между таблицами. Реализовал все необходимые CRUD операции, добавил фильтрацию, поиск и пагинацию.

## Использованные источники

1. Документация Sequelize - https://sequelize.org/docs/v6/
2. Документация Express - https://expressjs.com/
3. PostgreSQL документация - https://www.postgresql.org/docs/
4. Swagger/OpenAPI спецификация - https://swagger.io/docs/
5. Материалы курса Backend Development