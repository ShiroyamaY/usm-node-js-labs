import { db } from '../db.js'

const Todo = {
  async getTodosByStatus(status) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM todos'
      const params = []
      if (status === 'active') {
        query += ' WHERE completed = 0'
      } else if (status === 'completed') {
        query += ' WHERE completed = 1'
      }
      query += ' ORDER BY id DESC'
      db.all(query, params, (err, rows) => {
        if (err) return reject(err)
        resolve(rows)
      })
    })
  },

  async createTodo(title) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO todos (title, completed) VALUES (?, 0)',
        [title],
        function (err) {
          if (err) return reject(err)
          resolve({ id: this.lastID, title, completed: 0 })
        }
      )
    })
  },

  async toggleTodoById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT completed FROM todos WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err)
        if (!row) return resolve(null)
        const newValue = row.completed ? 0 : 1
        db.run('UPDATE todos SET completed = ? WHERE id = ?', [newValue, id], function (err) {
          if (err) return reject(err)
          resolve(this.changes > 0)
        })
      })
    })
  },

  async deleteTodoById(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM todos WHERE id = ?', [id], function (err) {
        if (err) return reject(err)
        resolve(this.changes > 0)
      })
    })
  }
}

export default Todo
