import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

await page.goto('http://localhost:4174/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const statMethods = await page.textContent('#statmethods');
const cardCount = await page.locator('#cards .card').count();
console.log('statmethods:', statMethods, 'card count:', cardCount);

// search
await page.fill('#search', 'pareto');
await page.waitForTimeout(300);
const filteredCount = await page.locator('#cards .card').count();
console.log('filtered card count for "pareto":', filteredCount);

// open detail drawer
await page.locator('#cards .card').first().click();
await page.waitForTimeout(300);
const drawerOpen = await page.locator('#overlay.open').count();
const detailTitle = await page.textContent('.detailtitle').catch(() => null);
console.log('drawer open:', drawerOpen, 'detail title:', detailTitle);
await page.locator('#close').click();

// unified search bar: same #search input drives both library filter and AI search
await page.fill('#search', 'test query');
await page.click('#aiSearchBtn');
await page.waitForTimeout(500);
const hint = await page.textContent('#aiSearchHint');
console.log('ai search hint after click:', hint);
const aiResultHidden = await page.getAttribute('#aiSearchResult', 'hidden');
console.log('ai result panel hidden (expected: not null, since not configured):', aiResultHidden);

await page.screenshot({ path: '/tmp/screenshot-full.png', fullPage: true });

console.log('console/page errors:', JSON.stringify(errors, null, 2));
await browser.close();

// Ignore benign/expected errors in this sandboxed test: blocked Google Fonts
// request (network policy of this dev sandbox, not an app bug) and the
// mocked /api/ai-search 503 (intentional "not configured" response).
const realErrors = errors.filter(
  (e) => !/fonts\.googleapis\.com/.test(e) && !/503/.test(e) && !/ERR_TUNNEL_CONNECTION_FAILED/.test(e)
);
if (realErrors.length > 0) {
  console.error('Unexpected errors:', realErrors);
  process.exit(1);
}
if (cardCount !== 119) throw new Error('expected 119 cards, got ' + cardCount);
if (filteredCount < 1) throw new Error('search filter produced 0 results');
if (!drawerOpen) throw new Error('detail drawer did not open');
console.log('SMOKE TEST PASSED');
