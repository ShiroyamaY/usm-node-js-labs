import { Sequelize } from 'sequelize';
import config from '../config/database.js';
import UserModel from './User.js';
import CategoryModel from './Category.js';
import TodoModel from './Todo.js';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging
  }
);

const db = {
  Sequelize,
  sequelize,
  User: UserModel(sequelize, Sequelize),
  Category: CategoryModel(sequelize, Sequelize),
  Todo: TodoModel(sequelize, Sequelize)
};

db.Category.hasMany(db.Todo, { foreignKey: 'category_id', as: 'todos' });
db.Todo.belongsTo(db.Category, { foreignKey: 'category_id', as: 'category' });

db.User.hasMany(db.Todo, { foreignKey: 'user_id', as: 'todos' });
db.Todo.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });

export default db;