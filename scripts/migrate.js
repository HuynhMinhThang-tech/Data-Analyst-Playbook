// Creates/updates the database schema. Run with: npm run migrate
// Requires DATABASE_URL in the environment (.env locally, or exported in shell).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL chưa được cấu hình. Tạo file .env từ .env.example rồi điền connection string Postgres.');
  }

  const schema = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(schema);
    console.log('✓ Migration thành công: đã tạo bảng categories, methods, method_examples, ai_search_log.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('✗ Migration thất bại:', err.message);
  process.exit(1);
});
