import initSqlite from 'sql.js'
import * as fs from 'fs'
import * as path from 'path'

class Database {
  constructor(filePath) {
    this.filePath = filePath
    this.SQL = null
    this.db = null
  }

  async init() {
    this.SQL = await initSqlite()
    const dbPath = path.resolve(this.filePath)
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath)
      this.db = new this.SQL.Database(fileBuffer)
    } else {
      this.db = new this.SQL.Database()
    }
  }

  close() {
    if (!this.db) return
    const data = this.db.export()
    const buffer = Buffer.from(data)
    const dir = path.dirname(path.resolve(this.filePath))
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(this.filePath, buffer)
    this.db.close()
    this.db = null
  }

  exec(sql) {
    // Split by semicolon to execute multiple statements (sql.js only supports one at a time)
    const statements = sql.split(';').filter(s => s.trim().length > 0)
    for (const stmt of statements) {
      this.db.run(stmt)
    }
  }

  prepare(sql) {
    const self = this
    const checkUndefined = (params, context) => {
      for (let i = 0; i < params.length; i++) {
        if (params[i] === undefined) {
          throw new Error(`Undefined parameter at index ${i} in ${context}: ${JSON.stringify(params)}`)
        }
      }
    }
    return {
      run: (params = []) => {
        checkUndefined(params, 'run')
        self.db.run(sql, params)
        const stmt = self.db.prepare('SELECT last_insert_rowid() as id')
        let lastId = null
        if (stmt.step()) {
          const result = stmt.getAsObject()
          lastId = result.id
        }
        stmt.free()
        return { lastInsertRowid: lastId, changes: self.db.getRowsModified() }
      },
      get: (params = []) => {
        checkUndefined(params, 'get')
        const stmt = self.db.prepare(sql)
        try {
          stmt.bind(params)
          if (stmt.step()) {
            return stmt.getAsObject()
          }
          return undefined
        } finally {
          stmt.free()
        }
      },
      all: (params = []) => {
        checkUndefined(params, 'all')
        const stmt = self.db.prepare(sql)
        try {
          stmt.bind(params)
          const rows = []
          while (stmt.step()) {
            rows.push(stmt.getAsObject())
          }
          return rows
        } finally {
          stmt.free()
        }
      }
    }
  }

  transaction(fn) {
    this.db.run('BEGIN TRANSACTION')
    try {
      fn(this)
      this.db.run('COMMIT')
    } catch (err) {
      this.db.run('ROLLBACK')
      throw err
    }
  }
}

// Factory for creating separate instances (used by seed)
function createDatabase(filePath = 'happen.db') {
  return new Database(filePath)
}

// Shared instance for the server
const db = new Database('happen.db')

export { Database, createDatabase, db }
export default db

