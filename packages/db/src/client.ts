import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

type SqlClient = ReturnType<typeof postgres>
type DatabaseConnection = ReturnType<typeof drizzle>

let _sql: SqlClient | null = null
let _db: DatabaseConnection | null = null

function createConnection(): DatabaseConnection {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  _sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
  })
  _db = drizzle(_sql)
  return _db
}

export function getDb() {
  if (!_db) {
    createConnection()
  }
  return _db!
}

export async function closeDb() {
  if (_sql) {
    await _sql.end()
    _sql = null
    _db = null
  }
}

export type Database = DatabaseConnection
