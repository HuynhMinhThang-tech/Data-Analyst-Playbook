// Provider-agnostic REAL web search (not just the AI model's trained knowledge).
//
// Configure with environment variables once you have an API key:
//   SEARCH_PROVIDER = tavily | serper | bing
//   TAVILY_API_KEY / SERPER_API_KEY / BING_API_KEY  (matching the provider)
//
// Tavily is recommended: it's built for LLM/AI search use cases and has a
// free tier, but any of the three work with zero other code changes.

export function isSearchConfigured() {
  const provider = (process.env.SEARCH_PROVIDER || '').toLowerCase();
  if (provider === 'tavily') return Boolean(process.env.TAVILY_API_KEY);
  if (provider === 'serper') return Boolean(process.env.SERPER_API_KEY);
  if (provider === 'bing') return Boolean(process.env.BING_API_KEY);
  return false;
}

export async function webSearch(query, { maxResults = 5 } = {}) {
  const provider = (process.env.SEARCH_PROVIDER || '').toLowerCase();
  if (provider === 'tavily') return searchTavily(query, maxResults);
  if (provider === 'serper') return searchSerper(query, maxResults);
  if (provider === 'bing') return searchBing(query, maxResults);
  throw new Error(
    'SEARCH_PROVIDER chưa được cấu hình hoặc không hợp lệ (dùng: tavily | serper | bing).'
  );
}

async function searchTavily(query, maxResults) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults,
    }),
  });
  if (!res.ok) throw new Error(`Tavily API lỗi ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.results || []).map((r) => ({ title: r.title, url: r.url, snippet: r.content }));
}

async function searchSerper(query, maxResults) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: maxResults }),
  });
  if (!res.ok) throw new Error(`Serper API lỗi ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.organic || [])
    .slice(0, maxResults)
    .map((r) => ({ title: r.title, url: r.link, snippet: r.snippet }));
}

async function searchBing(query, maxResults) {
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY },
  });
  if (!res.ok) throw new Error(`Bing API lỗi ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.webPages?.value || []).map((r) => ({
    title: r.name,
    url: r.url,
    snippet: r.snippet,
  }));
}
