import path from 'path'
import fs from 'fs'
import sqlite3pkg from 'sqlite3'
import config from './config.js'
import { fileURLToPath } from 'url'

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
