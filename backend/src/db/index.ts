import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to initialize the database");
}

export const pool = mysql.createPool(env.DATABASE_URL);
export const db = drizzle<typeof schema, Pool>({ client: pool, schema, mode: "default" });

export async function checkDatabaseConnection(): Promise<void> {
  await db.execute(sql`SELECT 1`);
}
