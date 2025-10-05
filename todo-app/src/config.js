import 'dotenv/config'

const config = {
  appName: process.env.APP_NAME || 'TodoApp',
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || './data/todo.sqlite'
}

export default config
