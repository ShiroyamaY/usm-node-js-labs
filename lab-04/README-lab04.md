# Лабораторная работа №4. Обработка ошибок, валидация и логирование

## Описание

В этой части курса мы продолжили развивать наш TODO API. Главная цель — сделать сервис предсказуемым: все ошибки должны обрабатываться одинаково, входящие данные всегда проверяются до попадания в бизнес-логику, а ключевые события попадают в логи и в Sentry. 

## Цели

- Научиться централизованно ловить ошибки Express‑приложения и возвращать унифицированные ответы.
- Настроить строгую валидацию входных данных на всех уровнях — `params`, `query`, `body`.
- Вести структурированное логирование и сохранять историю с ротацией файлов.
- Подключить Sentry для мониторинга критичных исключений и фильтровать шумные (валидационные) ошибки.

## Используемые технологии

- **Express**, **Sequelize**, **PostgreSQL** — базовый стек API.
- **express-validator** — декларативные цепочки валидации.
- **winston**, **winston-daily-rotate-file**, **morgan** — логирование.
- **@sentry/node** — внешнее отслеживание ошибок.
- **dotenv** — конфигурация окружения.

## Подготовка и запуск

1. **Сконфигурировать окружение.** Берём актуальный `.env` (или копируем шаблон, если он есть) и заполняем:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — доступ к PostgreSQL.
   - `JWT_SECRET` и `JWT_EXPIRE` — параметры токенов.
   - `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `LOG_LEVEL` — по ситуации (можно оставить пустым DSN для разработки).
2. **Поднять инфраструктуру.** Если используем docker-compose, запускаем `docker compose up -d postgres` (или всю связку). Иначе убеждаемся, что локальный Postgres запущен.
3. **Установить зависимости.**
   ```bash
   npm install
   ```
4. **Провести миграции (и, при необходимости, сиды).**
   ```bash
   npm run migrate
   npm run seed       
   ```
5. **Запустить приложение.**
   ```bash
   npm run dev         
   ```
6. **Проверить логи.** В консоли появится информация о подключении к БД, а в каталоге `logs/` начнёт формироваться файл `application-YYYY-MM-DD.log`.
7. **Открыть документацию.** Swagger доступен по `http://localhost:3000/api-docs`, а корневой `/` возвращает сервисное сообщение.

## Шаг 1. Централизованная обработка ошибок

До этой работы каждая ошибка обрабатывалась вручную (`try/catch` в контроллере), из-за чего структура ответов отличалась, а некоторые промисы могли «падать» без обработки. Нам нужно было привести механизм к единому виду и подготовить основу для логирования + Sentry.

**Как:** мы создали иерархию ошибок (`src/utils/errors.js`) и helper `asyncHandler`, который оборачивает все контроллеры:

```javascript
// src/utils/asyncHandler.js
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

Каждый контроллер теперь выбрасывает `ApiError` или его наследника, а глобальный middleware `errorHandler` приводит ответ к формату `{ status: "error", message: "...", errors?: [] }` и решает, стоит ли отправлять событие в Sentry:

```javascript
// src/middleware/errorHandler.js
const error = buildApiError(err);
logger.error(error.message, { statusCode: error.statusCode, path: req.originalUrl, ... });
if (client && error.shouldReport) {
  Sentry.captureException(error, { tags: { component: 'express', path: req.originalUrl } });
}
res.status(error.statusCode).json({
  status: 'error',
  message: error.isOperational ? error.message : 'Internal server error',
  ...(error instanceof ValidationError && { errors: error.details })
});
```

Теперь любое исключение (из контроллера, middleware или Sequelize) преобразуется в `ApiError`. Это помогает фронтенду получать одинаковые ответы и избавляет нас от дублирования `try/catch`. К тому же, мы отделили «операционные» ошибки (ожидаемые сценарии) от внутренних падений.

## Шаг 2. Валидация данных

Ранее проверка данных жила прямо в контроллерах, а иногда отсутствовала вовсе. Из-за этого можно было создать категорию без названия или задачу с кривой датой. Необходимо иметь чёткий контракт запросов и не допускать мусорные данные в БД.

Для каждого маршрута прописали цепочку express-validator, вынесли общий middleware `validateRequest` и собрали все правила в отдельной директории `src/validators`, чтобы ими было легко управлять и расширять. Например, набор правил для регистрации пользователя:

```javascript
// src/validators/authValidators.js
export const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];
```

Валидация запросов к TODO:

```javascript
// src/validators/todoValidators.js
export const todoQueryValidation = [
  query('category')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('category must be a positive integer')
    .toInt(),
  query('completed')
    .optional()
    .isBoolean()
    .withMessage('completed must be a boolean')
    .toBoolean(),
  query('sort')
    .optional()
    .isIn(['created_at', 'updated_at', 'title', 'due_date'])
];
```

**Почему:** перенос проверки в middleware и выделение валидаторов в отдельные файлы позволили контроллерам сосредоточиться на бизнес-логике. Любые ошибки валидации генерируют `ValidationError`, которые не отправляются в Sentry и возвращаются с кодом 400 и массивом `{ field, message }`. Это повышает доверие к данным в БД и экономит время на отладку.

## Шаг 3. Логирование и ротация

**Зачем:** без логов сложно понять, что происходило перед падением сервера, какие запросы были выполнены, и подключился ли сервис к БД. Нам нужен был единый логгер и сохранение истории.

**Как:** настроили Winston с консольным и файловым транспортами (`src/config/logger.js`). Папка `logs` создаётся автоматически, а файлы крутятся ежедневно:

```javascript
const transports = [
  new winston.transports.Console({ level, format: consoleFormat }),
  new DailyRotateFile({
    dirname: logDir,
    filename: 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level,
    format: fileFormat
  })
];
```

Дополнительно подключили `morgan`, чтобы HTTP-запросы писались в тот же поток:

```javascript
// src/app.js
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, { stream: { write: (message) => logger.info(message.trim()) } }));
```

**Почему:** теперь у нас есть история обращений к API и все ошибки попадают в один лог. Это облегчает расследование инцидентов и позволяет анализировать нагрузку. Ротация не даёт логам бесконтрольно расти.

## Шаг 4. Интеграция с Sentry

**Зачем:** даже с логами удобно получать push-уведомления о критичных ошибках. Sentry помогает собирать стеки и окружение без постоянного мониторинга сервера.

**Как:** инициализировали SDK в `src/app.js` (только если `SENTRY_DSN` задан) и дублируем ошибки из `errorHandler`, кроме ValidationError:

```javascript
// src/app.js
if (isSentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0)
  });
  app.use(Sentry.Handlers.requestHandler());
}
```

```javascript
// src/middleware/errorHandler.js
if (client && error.shouldReport) {
  Sentry.captureException(error, {
    tags: { component: 'express', path: req.originalUrl, method: req.method },
    extra: { userId: req.user?.id, details: error.details }
  });
}
```

Теперь мы можем оперативно реагировать на продакшн-сбои. Отделив операционные ошибки от неожиданных, мы не засоряем Sentry «ожидаемыми» сценариями и сосредотачиваемся на действительно критичных проблемах.

## Ответы на контрольные вопросы

1. **Преимущества централизованной обработки ошибок в Express.**  
   Мы получили единый формат ответов, избавились от дублирования `try/catch` и подключили логирование/Sentry в одном месте. Это уменьшает вероятность пропустить ошибку и упрощает поддержку.

2. **Категории логов и причины выбора.**  
   - *HTTP* — через morgan фиксируем каждый запрос (метод, статус, время), чтобы понимать контекст ошибок.  
   - *Info* — успешные события (старт сервера, подключение к БД). Они подтверждают, что сервис жив.  
   - *Error* — все исключения с контекстом (путь, пользователь, стек). Это база для расследований.  
   Ротация и json-формат позволяют подключать внешние анализаторы и не переполнять диск.

3. **Подходы к валидации данных и наш выбор.**  
   Можно валидировать вручную в контроллерах, использовать Joi/Celebrate или express-validator. Мы выбрали **express-validator** за декларативность, тесную интеграцию с Express и возможность переиспользовать готовые цепочки (`registerValidation`, `todoQueryValidation`). Плюс, он хорошо сочетается с нашим `validateRequest`, который заранее формирует `ValidationError`.

## Вывод

Эта лабораторная показала, насколько мощным становится API, когда мы думаем не только о маршрутах, но и о процессах вокруг них. Мы сами увидели, как централизованные ошибки, модульные валидаторы, логирование и Sentry собираются в единую систему, которая помогает развивать сервис без страха. Теперь я уверен: любое следующее обновление ляжет на прочный фундамент, который мы построили своими руками.
