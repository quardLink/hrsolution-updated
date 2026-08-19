import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon's HTTP driver — each query is a plain HTTPS request, so it works
// unmodified inside Vercel's serverless functions (no connection pool to
// manage or exhaust across cold starts).
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required but was not provided.");
  }
  const sql = neon(url);
  db = drizzle(sql, { schema });
  return db;
}

export { schema };
