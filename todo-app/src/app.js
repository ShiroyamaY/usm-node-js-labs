import config from './config.js'
import { renderNotFound } from './controllers/errorController.js'
import { fileURLToPath } from 'url'
import { runMigrations } from './db.js'
import express from 'express'
import routes from './routes/index.js'
import path from 'path'

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

const port = config.port
app.listen(port, () => {
  console.log(`[${config.appName}] listening on http://localhost:${port}`)
})

export default app