// GET /api/catalog
// Returns the full method catalog from the database, shaped exactly like the
// original hardcoded DB/ITEM_EXTRA objects so the frontend barely changed.
import { getSql } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const sql = getSql();
    const [cats, items, examples] = await Promise.all([
      sql`SELECT id, name, icon, description AS desc FROM categories ORDER BY sort_order ASC`,
      sql`SELECT id, category_id AS cat, title, question, when_to_use AS "when", inputs, how, output, caution, next_methods AS next, level, tags
          FROM methods ORDER BY id ASC`,
      sql`SELECT method_id, title, context, input, read, result, caveat, practice, viz_note AS "vizNote", walkthrough, steps
          FROM method_examples`,
    ]);

    const ITEM_EXTRA = {};
    for (const ex of examples) {
      ITEM_EXTRA[ex.method_id] = {
        example: {
          title: ex.title,
          context: ex.context,
          input: ex.input,
          read: ex.read,
          result: ex.result,
          caveat: ex.caveat,
          practice: ex.practice,
          vizNote: ex.vizNote,
          walkthrough: ex.walkthrough || [],
        },
        steps: ex.steps || [],
      };
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ DB: { cats, items }, ITEM_EXTRA });
  } catch (err) {
    console.error('catalog error:', err);
    res.status(500).json({ error: 'catalog_fetch_failed', message: String(err?.message || err) });
  }
}
