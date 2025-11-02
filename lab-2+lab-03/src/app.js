import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import db from './models/index.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import todoRoutes from './routes/todos.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use(errorHandler);

const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected successfully');

    if (process.env.NODE_ENV === 'development') {
      await db.sequelize.sync();
      console.log('Models synchronized');
    }

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API Docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Unable to connect to database:', error);
    process.exit(1);
  }
};

startServer();

export default app;