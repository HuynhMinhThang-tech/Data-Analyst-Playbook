import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
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

// AI search panel (expect "not configured" message, no crash)
await page.fill('#aiQuery', 'test query');
await page.click('#aiSearchBtn');
await page.waitForTimeout(500);
const hint = await page.textContent('#aiSearchHint');
console.log('ai search hint after click:', hint);

await page.screenshot({ path: '/tmp/screenshot-full.png', fullPage: true });

console.log('console/page errors:', JSON.stringify(errors, null, 2));
await browser.close();

if (errors.length > 0) process.exit(1);
if (cardCount !== 119) throw new Error('expected 119 cards, got ' + cardCount);
if (filteredCount < 1) throw new Error('search filter produced 0 results');
if (!drawerOpen) throw new Error('detail drawer did not open');
console.log('SMOKE TEST PASSED');
