import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

async function generate() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  const iconSvg = fs.readFileSync(path.join(publicDir, 'icon.svg'), 'utf-8');
  const maskableSvg = fs.readFileSync(path.join(publicDir, 'icon-maskable.svg'), 'utf-8');

  // Render 512x512 any
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(`<body style="margin:0;padding:0;overflow:hidden;background:transparent;">${iconSvg}</body>`);
  await page.screenshot({ path: path.join(publicDir, 'pwa-512x512.png'), omitBackground: true });

  // Render 192x192 any
  await page.setViewportSize({ width: 192, height: 192 });
  await page.setContent(`<body style="margin:0;padding:0;overflow:hidden;background:transparent;">${iconSvg}</body>`);
  await page.screenshot({ path: path.join(publicDir, 'pwa-192x192.png'), omitBackground: true });

  // Render 180x180 apple touch icon
  await page.setViewportSize({ width: 180, height: 180 });
  await page.setContent(`<body style="margin:0;padding:0;overflow:hidden;background:transparent;">${iconSvg}</body>`);
  await page.screenshot({ path: path.join(publicDir, 'apple-touch-icon.png'), omitBackground: true });

  // Render 512x512 maskable
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(`<body style="margin:0;padding:0;overflow:hidden;background:transparent;">${maskableSvg}</body>`);
  await page.screenshot({ path: path.join(publicDir, 'pwa-maskable-512x512.png'), omitBackground: false });

  // Create favicon.ico copy from 192x192
  fs.copyFileSync(path.join(publicDir, 'pwa-192x192.png'), path.join(publicDir, 'favicon.ico'));

  await browser.close();
  console.log('PWA PNG and touch icons generated successfully!');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
