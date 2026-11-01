// Shared Postgres client for serverless API routes (runs on Vercel).
// Uses the Neon HTTP driver, which works well in serverless/edge functions
// (no persistent connection/pooling needed). Any standard Postgres provider
// works too (Neon, Vercel Postgres, Supabase, RDS, ...) as long as
// DATABASE_URL is a valid Postgres connection string.
import { neon } from '@neondatabase/serverless';

let sqlClient;

export function getSql() {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL chưa được cấu hình. Thêm biến môi trường DATABASE_URL (connection string Postgres) trong Vercel > Settings > Environment Variables.'
      );
    }
    sqlClient = neon(url);
  }
  return sqlClient;
}
