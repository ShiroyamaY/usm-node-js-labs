# Лабораторная работа №3. Аутентификация и авторизация

## Описание работы

В этой лабораторной я расширил существующий TODO API, добавив систему пользователей с JWT аутентификацией и ролевой авторизацией. Теперь каждый пользователь может создавать и управлять только своими задачами, а администраторы имеют полный доступ ко всем ресурсам.

## Цель работы

- Освоить методы аутентификации и авторизации в backend
- Реализовать защиту API с помощью JWT (JSON Web Token)
- Научиться разграничивать доступ к ресурсам в зависимости от роли
- Понять разницу между аутентификацией и авторизацией

## Что нового

К предыдущему проекту я добавил:
- Таблицу `users` для хранения пользователей
- Систему регистрации и входа
- JWT токены для аутентификации
- Middleware для проверки прав доступа
- Ролевую модель (user/admin)

## Технологии

- **JWT (jsonwebtoken)** - для создания и проверки токенов
- **bcrypt** - для хеширования паролей
- **Middleware** - для защиты роутов

## Практическая часть

### Шаг 1. Структура базы данных

#### Таблица users

Я добавил новую таблицу для пользователей:

```javascript
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('users', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: Sequelize.STRING(50),
      unique: true,
      allowNull: false
    },
    email: {
      type: Sequelize.STRING(100),
      unique: true,
      allowNull: false
    },
    password: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    role: {
      type: Sequelize.STRING(20),
      defaultValue: 'user'
    },
    created_at: { type: Sequelize.DATE },
    updated_at: { type: Sequelize.DATE }
  });
};
```

Здесь важно что `username` и `email` уникальные - два пользователя не могут иметь одинаковые логины. Поле `role` по умолчанию `'user'`, но можно сделать и `'admin'`.

#### Модель User с хешированием пароля

```javascript
export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    username: {
      type: DataTypes.STRING(50),
      unique: true,
      validate: { len: [3, 50] }
    },
    email: {
      type: DataTypes.STRING(100),
      unique: true,
      validate: { isEmail: true }
    },
    password: { type: DataTypes.TEXT },
    role: {
      type: DataTypes.STRING(20),
      defaultValue: 'user',
      validate: { isIn: [['user', 'admin']] }
    }
  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });

  User.prototype.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
  };

  return User;
};
```

Тут я использовал хуки Sequelize - `beforeCreate` и `beforeUpdate`. Они автоматически хешируют пароль перед сохранением в БД. Это значит что в базе пароли хранятся в зашифрованном виде, никто не сможет их увидеть даже если получит доступ к БД.

Метод `comparePassword` сравнивает введенный пароль с хешем в базе - так мы проверяем правильность пароля при входе.

#### Связь с задачами

В таблицу `todos` добавил поле `user_id`:

```javascript
user_id: {
  type: Sequelize.INTEGER,
  allowNull: false,
  references: {
    model: 'users',
    key: 'id'
  },
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE'
}
```

`onDelete: 'CASCADE'` означает что при удалении пользователя все его задачи тоже удалятся автоматически.

### Шаг 2. Реализация аутентификации

#### Регистрация пользователя

```javascript
export const register = async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ 
      error: 'Username, email and password are required' 
    });
  }

  const user = await User.create({
    username,
    email,
    password,
    role: role || 'user'
  });

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
};
```

При регистрации пароль автоматически хешируется благодаря хуку в модели. В ответе я не возвращаю пароль - это небезопасно.

#### Вход пользователя

```javascript
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
};
```

Здесь важные моменты:
- Я не указываю конкретно "неверный email" или "неверный пароль" - просто "Invalid credentials". Это безопаснее, злоумышленник не узнает существует ли такой email в системе.
- JWT токен содержит минимум информации - только `id`, `username` и `role`. Пароль туда НЕ попадает.
- Токен подписывается секретным ключом из `.env` файла
- Токен действителен 7 дней (`expiresIn: '7d'`)

#### Получение профиля

```javascript
export const getProfile = async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] }
  });

  res.json({ user });
};
```

Этот эндпоинт защищен - работает только если передан валидный JWT токен. `req.user` появляется благодаря middleware, который я опишу дальше.

### Шаг 3. Реализация авторизации

#### Middleware для проверки JWT

```javascript
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

Этот middleware:
1. Проверяет что токен передан в заголовке `Authorization: Bearer <token>`
2. Извлекает токен (убирает "Bearer " в начале)
3. Проверяет подпись токена через `jwt.verify`
4. Достает пользователя из БД по `id` из токена
5. Прикрепляет пользователя к `req.user` чтобы использовать в контроллерах

Теперь можно защитить любой роут:

```javascript
router.get('/api/todos', authenticate, getAllTodos);
```

#### Middleware для проверки роли администратора

```javascript
export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only' });
  }
  next();
};
```

Простой middleware - если роль не `admin`, то доступ запрещен. Использую для защиты операций с категориями:

```javascript
router.post('/api/categories', authenticate, isAdmin, createCategory);
router.delete('/api/categories/:id', authenticate, isAdmin, deleteCategory);
```

Теперь создавать и удалять категории могут только администраторы.

### Шаг 4. Политика доступа по ролям

#### Обычный пользователь (role=user)

Изменил контроллер задач чтобы обычный пользователь видел только свои задачи:

```javascript
export const getAllTodos = async (req, res) => {
  const where = {};

  if (req.user.role !== 'admin') {
    where.user_id = req.user.id;
  }

  const todos = await Todo.findAll({ where });
  res.json({ data: todos });
};
```

Если пользователь не админ, добавляем условие `user_id = текущий_пользователь`. Админы видят всё.

#### Создание задачи

```javascript
export const createTodo = async (req, res) => {
  const { title, category_id, due_date } = req.body;

  const todo = await Todo.create({
    title,
    category_id,
    due_date,
    user_id: req.user.id
  });

  res.status(201).json({ todo });
};
```

Задача автоматически привязывается к пользователю который её создал.

#### Защита операций обновления и удаления

```javascript
export const updateTodo = async (req, res) => {
  const todo = await Todo.findByPk(req.params.id);

  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  if (req.user.role !== 'admin' && todo.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  await todo.update(req.body);
  res.json({ todo });
};
```

Здесь важная проверка - обычный пользователь может редактировать только свои задачи. Если `user_id` задачи не совпадает с `id` текущего пользователя - доступ запрещен (403 Forbidden). Админы могут редактировать любые задачи.

#### Администратор (role=admin)

Админы имеют полный доступ:
- Видят все задачи всех пользователей
- Могут редактировать и удалять любые задачи
- Могут управлять категориями (создавать, изменять, удалять)

### Как работает защита

Типичный защищенный роут выглядит так:

```javascript
router.get('/api/todos', 
  authenticate,        
  getAllTodos          
);

router.delete('/api/categories/:id',
  authenticate,        
  isAdmin,            
  deleteCategory      
);
```

Middleware выполняются по цепочке. Если какой-то вернул ошибку - дальше не идет.

## Тестирование

### 1. Регистрация пользователей

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "password": "password123"
  }'

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
  }'
```

### 2. Вход

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Ответ:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "role": "user"
  }
}
```

Сохраняем токен для дальнейших запросов.

### 3. Создание задачи (с токеном)

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "title": "Моя задача",
    "category_id": 1
  }'
```

### 4. Попытка доступа без токена

```bash
curl http://localhost:3000/api/todos
```

Ответ:
```json
{
  "error": "No token provided"
}
```

### 5. Попытка удалить чужую задачу

```bash
curl -X DELETE http://localhost:3000/api/todos/<чужая-задача-id> \
  -H "Authorization: Bearer <USER_TOKEN>"
```

Ответ:
```json
{
  "error": "Access denied"
}
```

### 6. Админ удаляет любую задачу

```bash
curl -X DELETE http://localhost:3000/api/todos/<любая-задача-id> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Ответ: `204 No Content` - успешно удалено.

## Обновленная Swagger документация

Я добавил в Swagger схему безопасности:

```javascript
components: {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  }
}
```

И отметил защищенные эндпоинты:

```javascript
/**
 * @swagger
 * /api/todos:
 *   get:
 *     summary: Get all todos
 *     security:
 *       - bearerAuth: []
 */
```

Теперь в Swagger UI есть кнопка "Authorize" где можно ввести JWT токен и тестировать защищенные эндпоинты.

## Контрольные вопросы

**1. Что такое JWT и как он работает?**

JWT (JSON Web Token) - это стандарт для безопасной передачи информации между сторонами в виде JSON объекта.

JWT состоит из трех частей, разделенных точками:
```
header.payload.signature
```

- **Header** - тип токена и алгоритм шифрования
- **Payload** - данные (в моем случае: id, username, role)
- **Signature** - подпись, которая гарантирует что токен не был изменен

Как работает:
1. Пользователь вводит логин/пароль
2. Сервер проверяет данные и создает JWT токен
3. Токен возвращается клиенту
4. Клиент сохраняет токен (обычно в localStorage или cookie)
5. При каждом запросе клиент отправляет токен в заголовке `Authorization: Bearer <token>`
6. Сервер проверяет подпись токена и извлекает данные
7. Если подпись валидна - запрос обрабатывается

Преимущества JWT:
- **Stateless** - серверу не нужно хранить сессии, вся информация в токене
- **Масштабируемость** - можно распределять запросы между серверами
- **Кросс-доменность** - токен работает на любом домене

В моем проекте JWT генерируется так:
```javascript
const token = jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

**2. Как реализовать безопасное хранение паролей пользователей?**

Пароли **никогда** нельзя хранить в открытом виде. Используется хеширование - односторонняя функция, которая превращает пароль в строку фиксированной длины.

Я использую библиотеку `bcrypt`:

```javascript
const hashedPassword = await bcrypt.hash(password, 10);

const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

Почему bcrypt хорош:
- **Соль (salt)** - добавляет случайные данные к паролю перед хешированием. Даже если два пользователя имеют одинаковый пароль, хеши будут разные.
- **Медленность** - специально сделан медленным чтобы усложнить перебор паролей (brute-force атаки)
- **Адаптивность** - можно увеличивать количество раундов со временем

Важно:
- Хеш нельзя "расшифровать" обратно в пароль
- Для проверки пароля нужно заново хешировать введенный пароль и сравнивать хеши
- Даже если злоумышленник получит доступ к базе, он не узнает пароли

**3. В чём разница между аутентификацией и авторизацией?**

Это два разных процесса:

**Аутентификация (Authentication)** - проверка личности. Отвечает на вопрос "Кто ты?"

Пример: вход в систему с логином и паролем. Система проверяет что ты действительно тот, за кого себя выдаешь.

В моем проекте:
```javascript
if (!authHeader) {
  return res.status(401).json({ error: 'No token provided' });
}
```

**Авторизация (Authorization)** - проверка прав доступа. Отвечает на вопрос "Что ты можешь делать?"

Пример: после входа система проверяет твою роль и решает к каким ресурсам ты имеешь доступ.

В моем проекте:
```javascript
if (req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Access denied' });
}
```

Коды ошибок:
- **401 Unauthorized** - ошибка аутентификации (нет токена или он невалиден)
- **403 Forbidden** - ошибка авторизации (токен есть, но нет прав)

Аналогия:
- Аутентификация = показать паспорт на входе
- Авторизация = проверить что у тебя есть билет VIP-зоны

**4. Какие преимущества и недостатки использования Passport.js для аутентификации в Node.js?**

**Passport.js** - это middleware для аутентификации, которое поддерживает множество стратегий (local, JWT, OAuth, Google, Facebook и т.д.).

**Преимущества:**

- **Модульность** - можно легко добавлять разные способы входа (email/password, Google, GitHub)
- **Готовые стратегии** - не нужно писать логику с нуля
- **Гибкость** - можно настроить под свои нужды
- **Стандартизация** - понятная структура для любого разработчика

**Недостатки:**

- **Избыточность** - для простых проектов может быть overkill
- **Сложность настройки** - требует понимания как работают стратегии
- **Дополнительная зависимость** - еще одна библиотека в проекте
- **Session-based по умолчанию** - нужно дополнительно настраивать для JWT

В моем проекте я реализовал JWT вручную, без Passport, потому что:
- Проект простой, одна стратегия аутентификации
- Хотел разобраться как JWT работает под капотом
- Меньше зависимостей

Но если бы нужно было добавить OAuth (вход через Google) - использовал бы Passport с стратегией `passport-google-oauth20`.

## Выводы

В этой лабораторной я добавил полноценную систему аутентификации и авторизации к существующему API. Разобрался как работают JWT токены, как безопасно хранить пароли с помощью bcrypt, и как разграничивать доступ к ресурсам в зависимости от роли пользователя.

Самое интересное было реализовать middleware для проверки прав - это элегантное решение, которое позволяет защитить роуты одной строчкой кода. Теперь понимаю разницу между аутентификацией (проверка личности) и авторизацией (проверка прав).

Проект получился безопасным - пароли хешируются, JWT токены подписываются секретным ключом, и каждый пользователь видит только свои данные (кроме админов). Готовое API можно использовать как основу для реального приложения.

## Использованные источники

1. JWT документация - https://jwt.io/introduction
2. Bcrypt для Node.js - https://www.npmjs.com/package/bcrypt
3. Документация Express middleware - https://expressjs.com/en/guide/using-middleware.html
4. Passport.js документация - http://www.passportjs.org/docs/
5. OWASP - best practices для аутентификации - https://cheatsheetseries.owasp.org/
6. Материалы курса Backend Development