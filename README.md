# Data Analyst Playbook — Thư viện phương pháp phân tích dữ liệu

Ứng dụng tra cứu 120 phương pháp phân tích dữ liệu (12 nhóm), đã được chuyển
từ dữ liệu hardcode trong 1 file HTML sang **database Postgres thật**, phục vụ
qua API, và có sẵn khung cho tính năng **AI tìm kiếm web thật sự + gợi ý
phương pháp nội bộ** (chỉ cần thêm API key sau).

## Kiến trúc

```
public/index.html   → giao diện gốc (giữ nguyên gần như 100%), giờ fetch dữ
                       liệu từ /api/catalog thay vì nhúng sẵn trong JS
api/catalog.js       → GET  — trả về toàn bộ danh mục (categories + methods +
                       ví dụ) từ Postgres, đúng định dạng frontend cần
api/ai-search.js      → POST — nhận {query}, gọi web search thật + AI, trả về
                        {answer, sources, methodIds} để hiển thị bên dưới
lib/db.js             → kết nối Postgres (Neon serverless driver)
lib/ai-provider.js     → lớp trừu tượng cho AI (openai | anthropic | google)
lib/search-provider.js → lớp trừu tượng cho tìm kiếm web (tavily | serper | bing)
sql/schema.sql         → schema: categories, methods, method_examples, ai_search_log
scripts/migrate.js      → tạo bảng trong Postgres
scripts/seed.js         → nạp data/db.json + data/item_extra.json vào Postgres
data/db.json, data/item_extra.json → dữ liệu gốc đã trích xuất từ file HTML cũ
```

Không dùng framework (Next.js/React...) — giữ nguyên app tĩnh + thêm
"serverless functions" trong thư mục `api/`, đúng mô hình Vercel hỗ trợ sẵn
không cần cấu hình gì thêm. Toàn bộ JS giao diện gốc (library/finder/
dashboard, ngăn kéo chi tiết, dark mode, in PDF...) được giữ nguyên logic —
chỉ thay chỗ lấy dữ liệu.

## Vì sao chọn Postgres (Neon / Vercel Postgres)

- Dữ liệu có **cấu trúc quan hệ rõ** (12 nhóm → 120 phương pháp) + phần
  **bán cấu trúc** (ví dụ, walkthrough, steps) → Postgres cho phép dùng bảng
  quan hệ cho phần cứng và cột `jsonb` cho phần linh hoạt, không phải đánh đổi.
- Có sẵn **full-text search** (`tsvector` + GIN index) ngay trong DB, không
  cần thêm dịch vụ tìm kiếm riêng.
- Tích hợp **1-click với Vercel** (Vercel Storage → Postgres, chạy trên nền
  Neon) hoặc tạo trực tiếp tại neon.tech (có gói miễn phí).
- Dễ **phát triển thêm**: có thể bật extension `pgvector` sau này để làm tìm
  kiếm ngữ nghĩa (semantic search) cho tính năng AI, thêm bảng người dùng,
  lịch sử tra cứu, v.v. mà không cần đổi nền tảng.

## Cài đặt & chạy local

```bash
npm install
cp .env.example .env     # rồi điền DATABASE_URL (xem bên dưới)
npm run setup            # = migrate + seed (tạo bảng rồi nạp dữ liệu)
vercel dev                # chạy local giống môi trường Vercel (cần: npm i -g vercel)
```

### Tạo database (DATABASE_URL)

Chọn 1 trong 2 cách:

1. **Qua Vercel (khuyến nghị, gắn liền với deploy)**: vào dự án trên Vercel →
   tab **Storage** → **Create Database** → chọn **Postgres** (chạy trên nền
   Neon) → sau khi tạo, Vercel tự thêm biến `DATABASE_URL` vào project; copy
   giá trị đó vào `.env` để chạy migrate/seed từ máy local.
2. **Trực tiếp tại [neon.tech](https://neon.tech)**: tạo project miễn phí,
   copy connection string vào `DATABASE_URL`.

## Deploy lên Vercel (qua GitHub)

1. Đẩy thư mục này lên một repo GitHub mới:
   ```bash
   git init
   git add .
   git commit -m "Khởi tạo Data Analyst Playbook (DB-backed)"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
2. Vào [vercel.com](https://vercel.com) → **Add New... → Project** → chọn
   repo GitHub vừa tạo → Vercel tự nhận diện đây là static + serverless
   functions, không cần chỉnh Build Command/Output Directory.
3. Tạo Postgres database cho project (mục **Tạo database** ở trên) — biến
   `DATABASE_URL` sẽ tự được thêm vào Environment Variables.
4. Chạy migrate + seed **một lần** nhắm vào database đó (chạy từ máy local
   với `DATABASE_URL` trỏ đúng vào DB production, hoặc dùng `vercel env pull`
   để lấy `.env` từ project):
   ```bash
   vercel env pull .env
   npm run setup
   ```
5. Từ lần sau, mỗi lần push lên GitHub nhánh `main`, Vercel tự động deploy lại
   (đây là ý "kết nối GitHub với Vercel với nhau").

## Bật tính năng AI tìm kiếm (khi có API key)

Tính năng tìm kiếm AI **đã có sẵn trên giao diện** (ô "Hỏi AI" phía trên
thanh tìm kiếm thường) nhưng sẽ báo "chưa cấu hình" cho tới khi bạn thêm đủ
2 nhóm biến môi trường trong **Vercel → Settings → Environment Variables**
(hoặc `.env` khi chạy local):

**1. Một nhà cung cấp AI** (chọn 1):

| `AI_PROVIDER` | Biến API key cần thêm |
|---|---|
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `google` | `GOOGLE_API_KEY` |

**2. Một nhà cung cấp tìm kiếm web thật sự** (chọn 1 — đây là phần giúp AI
"tự tìm kiến thức ở tất cả nguồn bên ngoài" thay vì chỉ dùng kiến thức huấn
luyện sẵn của model):

| `SEARCH_PROVIDER` | Biến API key cần thêm |
|---|---|
| `tavily` (khuyến nghị, có gói miễn phí, tối ưu cho AI) | `TAVILY_API_KEY` |
| `serper` | `SERPER_API_KEY` |
| `bing` | `BING_API_KEY` |

Sau khi thêm đủ 2 nhóm biến trên và redeploy, nút "Tìm kiếm AI" sẽ: tìm kiếm
web thật sự → đưa kết quả cho AI tổng hợp câu trả lời có trích dẫn nguồn →
đồng thời chọn ra các phương pháp phù hợp trong thư viện và hiển thị thành
thẻ ngay bên dưới câu trả lời. Không cần sửa code gì thêm khi đổi nhà cung
cấp — chỉ đổi 2 biến `AI_PROVIDER`/`SEARCH_PROVIDER` và key tương ứng.

## Dữ liệu gốc

`data/db.json` và `data/item_extra.json` là toàn bộ nội dung đã trích xuất
từ file HTML gốc (`Data_Analyst_Playbook_v2.html`): 12 nhóm, 119 phương pháp,
119 ví dụ chi tiết. Hai file này chỉ dùng để seed database lần đầu (hoặc seed
lại một database mới) — sau khi seed, ứng dụng đọc hoàn toàn từ Postgres qua
`/api/catalog`, không còn đọc 2 file JSON này lúc chạy.

Muốn sửa/thêm phương pháp: sửa trực tiếp trong database (qua SQL hoặc viết
thêm một trang quản trị sau này), hoặc sửa `data/db.json` /
`data/item_extra.json` rồi chạy lại `npm run seed` (an toàn để chạy lại
nhiều lần — tự ghi đè theo `id`).
