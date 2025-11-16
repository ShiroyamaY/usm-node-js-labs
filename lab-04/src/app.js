import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import db from './models/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './config/logger.js';
import { NotFoundError } from './utils/errors.js';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import todoRoutes from './routes/todos.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isSentryEnabled = Boolean(process.env.SENTRY_DSN);

if (isSentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : 0
  });

  app.use(Sentry.Handlers.requestHandler());
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  })
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/todos', todoRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'TODO API Server',
    version: '1.0.0',
    docs: '/api-docs'
  });
});

app.use((req, res, next) => {
  next(new NotFoundError('Route not found'));
});

if (isSentryEnabled) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(errorHandler);

const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    logger.info('Database connected successfully');

    if (process.env.NODE_ENV === 'development') {
      await db.sequelize.sync();
      logger.info('Models synchronized');
    }

    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`API Docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Unable to connect to database', { error: error.message });
    if (isSentryEnabled) {
      Sentry.captureException(error);
    }
    process.exit(1);
  }
};

startServer();

export default app;
