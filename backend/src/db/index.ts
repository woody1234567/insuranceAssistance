import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

export function createConnectionPool(): Pool {
  if (env.DATABASE_URL) {
    return mysql.createPool(env.DATABASE_URL);
  }

  if (env.DB_SOCKET_PATH || env.DB_HOST) {
    return mysql.createPool({
      socketPath: env.DB_SOCKET_PATH,
      host: env.DB_HOST,
      port: env.DB_PORT ?? 3306,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  throw new Error("DATABASE_URL or Cloud SQL connection parameters (DB_SOCKET_PATH / DB_HOST, DB_USER, DB_NAME) are required to initialize the database");
}

export const pool = createConnectionPool();
export const db = drizzle<typeof schema, Pool>({ client: pool, schema, mode: "default" });

export async function checkDatabaseConnection(): Promise<void> {
  await db.execute(sql`SELECT 1`);
}
