import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "./schema.js";

export type Database = MySql2Database<typeof schema>;

export function createDatabase(staging = false) {
const saves = schema.createSavesTable(staging);
let pool: mysql.Pool | null = null;
let database: Database | null = null;

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function dbConfigured(): boolean {
  return Boolean(
    env("DB_HOST") &&
      env("DB_NAME") &&
      env("DB_USER") &&
      env("DB_PASSWORD"),
  );
}

function getDb(): Database | null {
  if (database) return database;
  if (!dbConfigured()) return null;
  pool = mysql.createPool({
    host: env("DB_HOST"),
    port: Number(env("DB_PORT") ?? 3306),
    user: env("DB_USER"),
    password: env("DB_PASSWORD"),
    database: env("DB_NAME"),
    connectionLimit: 5,
    enableKeepAlive: true,
  });
  database = drizzle(pool, { schema, mode: "default" });
  return database;
}

async function ensureSchema(): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${staging ? "endless_dev_saves" : "endless_saves"} (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      player_name VARCHAR(80) NOT NULL,
      data JSON NOT NULL,
      revision INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function pingDatabase(): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  await db.execute("SELECT 1");
  return true;
}
return { getDb, ensureSchema, pingDatabase, saves };
}

export const { getDb, ensureSchema, pingDatabase } = createDatabase();
