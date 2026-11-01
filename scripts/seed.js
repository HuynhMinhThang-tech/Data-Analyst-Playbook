// Loads data/db.json + data/item_extra.json (extracted from the original
// static HTML) into Postgres. Idempotent: safe to re-run (upserts by id).
// Run with: npm run seed
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

  const DB = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/db.json'), 'utf8'));
  const EXTRA = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/item_extra.json'), 'utf8'));

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < DB.cats.length; i++) {
      const c = DB.cats[i];
      await client.query(
        `INSERT INTO categories (id, name, icon, description, sort_order)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET name=$2, icon=$3, description=$4, sort_order=$5`,
        [c.id, c.name, c.icon, c.desc, i]
      );
    }

    for (const m of DB.items) {
      await client.query(
        `INSERT INTO methods (id, category_id, title, question, when_to_use, inputs, how, output, caution, next_methods, level, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO UPDATE SET
           category_id=$2, title=$3, question=$4, when_to_use=$5, inputs=$6,
           how=$7, output=$8, caution=$9, next_methods=$10, level=$11, tags=$12`,
        [m.id, m.cat, m.title, m.question, m.when, m.inputs, m.how, m.output, m.caution, m.next, m.level, m.tags]
      );

      const ex = EXTRA[m.id];
      if (ex) {
        const e = ex.example || {};
        await client.query(
          `INSERT INTO method_examples (method_id, title, context, input, read, result, caveat, practice, viz_note, walkthrough, steps)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (method_id) DO UPDATE SET
             title=$2, context=$3, input=$4, read=$5, result=$6, caveat=$7,
             practice=$8, viz_note=$9, walkthrough=$10, steps=$11`,
          [
            m.id,
            e.title || null,
            e.context || null,
            e.input || null,
            e.read || null,
            e.result || null,
            e.caveat || null,
            e.practice || null,
            e.vizNote || null,
            JSON.stringify(e.walkthrough || []),
            JSON.stringify(ex.steps || []),
          ]
        );
      }
    }

    await client.query('COMMIT');
    console.log(
      `✓ Seed thành công: ${DB.cats.length} nhóm, ${DB.items.length} phương pháp, ${Object.keys(EXTRA).length} ví dụ chi tiết.`
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('✗ Seed thất bại:', err.message);
  process.exit(1);
});
