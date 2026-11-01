// One-off transformation: converts the original static HTML (with DB/ITEM_EXTRA
// hardcoded) into a DB-backed version that fetches /api/catalog, plus adds the
// AI web-search panel. Run once to produce public/index.html; the output is then
// hand-maintained (this script is kept for reference/reproducibility only).
import fs from 'node:fs';

const SRC = '/mnt/user-data/uploads/Data_Analyst_Playbook_v2.html';
const OUT = new URL('../public/index.html', import.meta.url);

let html = fs.readFileSync(SRC, 'utf8');
const lines = html.split('\n');

function replaceLineStartingWith(prefix, newLine, { required = true } = {}) {
  const idx = lines.findIndex((l) => l.startsWith(prefix));
  if (idx === -1) {
    if (required) throw new Error('Line not found for prefix: ' + prefix);
    return;
  }
  lines[idx] = newLine;
}

// 1) Replace the giant inline data consts with empty placeholders.
replaceLineStartingWith(
  'const DB=',
  'let DB={cats:[],items:[]};'
);

replaceLineStartingWith(
  'const catMap=Object.fromEntries(DB.cats',
  'let catMap={},methodMap={};function rebuildMaps(){catMap=Object.fromEntries(DB.cats.map(c=>[c.id,c]));methodMap=Object.fromEntries(DB.items.map(m=>[m.id,m]))}'
);

replaceLineStartingWith(
  'const ITEM_EXTRA=',
  'let ITEM_EXTRA={};'
);

// 2) Replace the synchronous boot sequence with an async one that fetches the
//    catalog from the API first, plus wires the new AI search panel.
replaceLineStartingWith(
  "initNav();renderDashboard();stats();renderLibrary();",
  `$('#aiSearchBtn').onclick=runAiSearch;$('#aiQuery').addEventListener('keydown',e=>{if(e.key==='Enter')runAiSearch()});
async function boot(){
  try{
    const res=await fetch('/api/catalog');
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    DB=data.DB&&data.DB.items&&data.DB.items.length?data.DB:DB;
    ITEM_EXTRA=data.ITEM_EXTRA||{};
    rebuildMaps();
  }catch(e){
    console.error('Không tải được dữ liệu từ /api/catalog:',e);
    toast('Không tải được dữ liệu từ máy chủ. Kiểm tra lại kết nối database.');
  }
  initNav();renderDashboard();stats();renderLibrary();
}
async function runAiSearch(){
  const q=$('#aiQuery').value.trim();
  if(!q){toast('Nhập câu hỏi để AI tìm kiếm');return}
  const btn=$('#aiSearchBtn');btn.disabled=true;btn.textContent='Đang tìm…';
  $('#aiSearchResult').hidden=true;
  try{
    const res=await fetch('/api/ai-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q})});
    const data=await res.json();
    if(!res.ok){
      $('#aiSearchHint').textContent=data.message||'Tính năng AI tìm kiếm chưa được cấu hình (cần API key trên máy chủ).';
      return;
    }
    $('#aiAnswer').textContent=data.answer||'';
    $('#aiSources').innerHTML=(data.sources||[]).map((s,i)=>\`<a href="\${esc(s.url)}" target="_blank" rel="noopener"><span class="ai-source-num">\${i+1}</span>\${esc(s.title||s.url)}</a>\`).join('');
    const rel=(data.methodIds||[]).map(id=>methodMap[id]).filter(Boolean);
    $('#aiRelatedLabel').hidden=rel.length===0;
    $('#aiRelatedGrid').innerHTML=rel.map(card).join('');
    bindCards($('#aiRelatedGrid'));
    $('#aiSearchResult').hidden=false;
  }catch(e){
    console.error(e);
    $('#aiSearchHint').textContent='Có lỗi khi gọi AI tìm kiếm. Thử lại sau.';
  }finally{
    btn.disabled=false;btn.textContent='Tìm kiếm AI';
  }
}
boot();`
);

// 3) Insert the AI search panel markup right after the hero section, before the stats row.
const heroMarker = '<div class="searchhint">Tìm theo tên, câu hỏi, dấu hiệu sử dụng, đầu ra hoặc từ khóa tiếng Anh.</div></section>';
const aiPanel = `<section class="ai-search-panel" id="aiSearchPanel"><div class="ai-search-row"><span class="ai-search-badge">AI</span><input type="text" id="aiQuery" placeholder="Hỏi AI: tìm kiếm thật trên web rồi gợi ý phương pháp phù hợp trong thư viện…"><button class="primary" id="aiSearchBtn">Tìm kiếm AI</button></div><div class="ai-search-hint" id="aiSearchHint">Tìm kiếm web thật sự + gợi ý phương pháp nội bộ. Cần cấu hình API key AI và tìm kiếm web trên máy chủ (xem README) trước khi dùng được.</div><div id="aiSearchResult" class="ai-search-result" hidden><div class="ai-answer" id="aiAnswer"></div><div class="ai-sources" id="aiSources"></div><div class="ai-related-label" id="aiRelatedLabel" hidden>Phương pháp liên quan trong hệ thống</div><div class="grid" id="aiRelatedGrid"></div></div></section>`;

{
  const idx = lines.findIndex((l) => l.includes(heroMarker));
  if (idx === -1) throw new Error('hero marker not found');
  lines[idx] = lines[idx].replace(heroMarker, heroMarker + aiPanel);
}

// 4) Insert new CSS for the AI search panel right before </style>.
const newCss = `.ai-search-panel{margin-top:14px;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--panel-2,rgba(99,102,241,.04))}
.ai-search-row{display:flex;gap:8px;align-items:center}
.ai-search-badge{flex:none;font-size:11px;font-weight:700;letter-spacing:.04em;color:#fff;background:#6366f1;border-radius:6px;padding:3px 7px}
.ai-search-row input{flex:1;min-width:0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;background:var(--bg);color:var(--text)}
.ai-search-hint{margin-top:6px;font-size:12.5px;color:var(--muted)}
.ai-search-result{margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)}
.ai-answer{white-space:pre-wrap;line-height:1.6;margin-bottom:10px}
.ai-sources{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.ai-sources a{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;padding:5px 9px;border:1px solid var(--line);border-radius:999px;color:var(--text);text-decoration:none;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ai-sources a:hover{border-color:#6366f1}
.ai-source-num{flex:none;font-weight:700;color:#6366f1}
.ai-related-label{font-weight:600;margin-bottom:8px}
body.dark .ai-search-panel{background:rgba(99,102,241,.08)}
`;
{
  const idx = lines.findIndex((l) => l.includes('</style></head><body>'));
  if (idx === -1) throw new Error('style close marker not found');
  lines[idx] = lines[idx].replace('</style></head><body>', newCss + '</style></head><body>');
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log('Wrote', OUT.pathname, lines.join('\n').length, 'bytes');
