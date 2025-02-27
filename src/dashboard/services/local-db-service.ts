import { ServerActionResponse } from "@/features/common/server-action-response";
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { stringIsNullOrEmpty } from "../utils/helpers";

// Database configuration
const DB_PATH = process.env.LOCAL_DB_PATH || path.join(process.cwd(), 'data', 'copilot-metrics.db');

// Ensure the database directory exists
const ensureDbDirectory = () => {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
};

// Create a singleton database connection
let _db: Database.Database | null = null;

export const getDbConnection = (): Database.Database => {
  if (!_db) {
    ensureDbDirectory();
    _db = new Database(DB_PATH);
    initializeDatabase(_db);
  }
  return _db;
};

// Initialize database schema if it doesn't exist
const initializeDatabase = (db: Database.Database) => {
  // Create metrics_history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics_history (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      enterprise TEXT,
      organization TEXT,
      team TEXT,
      data TEXT NOT NULL,
      last_update TEXT NOT NULL
    )
  `);

  // Create seats_history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS seats_history (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      enterprise TEXT,
      organization TEXT,
      team TEXT,
      seats TEXT NOT NULL,
      total_seats INTEGER NOT NULL,
      last_update TEXT NOT NULL
    )
  `);
};

// Check if local database is configured
export const localDbConfiguration = (): boolean => {
  try {
    getDbConnection();
    return true;
  } catch (error) {
    console.error("Error configuring local database:", error);
    return false;
  }
};

// Query builder helper
export interface QueryParams {
  query: string;
  params: Record<string, any>;
}

// Execute a query and return results
export const executeQuery = <T>(querySpec: QueryParams): T[] => {
  const db = getDbConnection();
  const statement = db.prepare(querySpec.query);
  return statement.all(querySpec.params) as T[];
};

// Close database connection when app shuts down
export const closeDbConnection = () => {
  if (_db) {
    _db.close();
    _db = null;
  }
};