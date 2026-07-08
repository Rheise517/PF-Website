import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, 'temporary screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function getNextNum() {
  const files = fs.readdirSync(screenshotsDir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'));
  const nums = files.map(f => { const m = f.match(/^screenshot-(\d+)/); return m ? parseInt(m[1], 10) : 0; });
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}

const sections = ['hero', 'about', 'offer', 'who', 'coach', 'schedule', 'pricing', 'contact'];

const browser = await puppeteer.launch({
  channel: 'chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true,
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

for (const id of sections) {
  const el = await page.$(`#${id}`);
  if (!el) { console.log(`Section #${id} not found, skipping`); continue; }

  const box = await el.boundingBox();
  if (!box) { console.log(`No bounding box for #${id}, skipping`); continue; }

  // Scroll the section into view with a little padding
  await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y - 20), behavior: 'instant' }), box.y);
  await new Promise(r => setTimeout(r, 200));

  const num = getNextNum();
  const outPath = path.join(screenshotsDir, `screenshot-${num}-section-${id}.png`);

  await page.screenshot({
    path: outPath,
    clip: { x: 0, y: box.y - 20 < 0 ? 0 : box.y - 20, width: 1440, height: Math.min(box.height + 40, 1800) },
  });

  console.log(`Saved: ${outPath}`);
}

await browser.close();
console.log('Done.');
