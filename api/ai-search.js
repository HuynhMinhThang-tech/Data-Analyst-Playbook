// POST /api/ai-search  { query: string }
// 1) Runs a REAL web search (external sources) via the configured search provider.
// 2) Asks the configured AI model to answer the question from those results and
//    to pick the most relevant methods from the internal catalog.
// 3) Returns { answer, sources, methodIds } for the frontend to render — the
//    AI's answer + sources on top, matching internal methods displayed below.
import { getSql } from '../lib/db.js';
import { isAiConfigured, chatComplete } from '../lib/ai-provider.js';
import { isSearchConfigured, webSearch } from '../lib/search-provider.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const query = (req.body && req.body.query ? String(req.body.query) : '').trim();
  if (!query) {
    res.status(400).json({ error: 'missing_query', message: 'Thiếu nội dung tìm kiếm.' });
    return;
  }

  const aiReady = isAiConfigured();
  const searchReady = isSearchConfigured();
  if (!aiReady || !searchReady) {
    res.status(503).json({
      error: 'not_configured',
      message:
        'Tính năng AI tìm kiếm chưa được bật. Cần cấu hình AI_PROVIDER + API key tương ứng, và SEARCH_PROVIDER + API key tìm kiếm web tương ứng trong biến môi trường trên Vercel (xem README).',
      aiConfigured: aiReady,
      searchConfigured: searchReady,
    });
    return;
  }

  try {
    const sources = await webSearch(query, { maxResults: 5 });

    const sql = getSql();
    const methods = await sql`SELECT id, title, tags, category_id AS cat FROM methods ORDER BY id`;
    const catalogText = methods
      .map((m) => `${m.id}: ${m.title} [${m.cat}] (từ khóa: ${m.tags || ''})`)
      .join('\n');
    const sourcesText = sources
      .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet || ''}`)
      .join('\n\n');

    const system =
      'Bạn là trợ lý phân tích dữ liệu. Dựa trên kết quả tìm kiếm web thật sự được cung cấp, trả lời ngắn gọn, chính xác câu hỏi của người dùng bằng tiếng Việt và trích dẫn nguồn bằng số [1][2]... ' +
      'Sau đó chọn tối đa 6 phương pháp phù hợp nhất từ danh mục nội bộ bên dưới (chỉ dùng đúng id có trong danh mục, không bịa id). ' +
      'Trả lời DUY NHẤT một JSON hợp lệ theo đúng dạng {"answer": "...", "methodIds": ["m001", "m002"]}, không thêm chữ nào khác ngoài JSON.';
    const prompt = `Câu hỏi: ${query}\n\nKết quả tìm kiếm web:\n${sourcesText}\n\nDanh mục phương pháp nội bộ:\n${catalogText}`;

    const raw = await chatComplete({ system, prompt });

    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      parsed = { answer: raw.trim(), methodIds: [] };
    }

    const validIds = new Set(methods.map((m) => m.id));
    const methodIds = Array.isArray(parsed.methodIds)
      ? parsed.methodIds.filter((id) => validIds.has(id)).slice(0, 6)
      : [];

    // Log for future tuning / caching (best-effort; failure here shouldn't break the response).
    try {
      await sql`INSERT INTO ai_search_log (query, answer, method_ids, sources)
                VALUES (${query}, ${parsed.answer || ''}, ${JSON.stringify(methodIds)}, ${JSON.stringify(sources)})`;
    } catch (logErr) {
      console.warn('ai_search_log insert failed (non-fatal):', logErr?.message || logErr);
    }

    res.status(200).json({ answer: parsed.answer || '', methodIds, sources });
  } catch (err) {
    console.error('ai-search error:', err);
    res.status(500).json({ error: 'ai_search_failed', message: String(err?.message || err) });
  }
}
