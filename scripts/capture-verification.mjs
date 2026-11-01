import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell',
    args: ['--no-sandbox']
  });

  // Desktop viewport
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Unlock if prompted
  const passInputs = await page.$$('input[type="password"]');
  if (passInputs.length >= 2) {
    await passInputs[0].fill('StrongPassphrase!2026');
    await passInputs[1].fill('StrongPassphrase!2026');
    await page.click('button[type="submit"]');
    await page.waitForSelector('header');
  } else if (passInputs.length === 1) {
    await passInputs[0].fill('StrongPassphrase!2026');
    await page.click('button[type="submit"]');
    await page.waitForSelector('header');
  }

  // Ensure 2 accounts exist for the grid view
  const hasAccounts = await page.$$('h3');
  if (hasAccounts.length === 0) {
    await page.click('button:has-text("افزودن حساب")');
    await page.waitForSelector('button:has-text("چسباندن آدرس otpauth")');
    await page.click('button:has-text("چسباندن آدرس otpauth")');
    await page.fill('textarea', 'otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXP&issuer=GitHub');
    await page.click('button[type="submit"]:has-text("ذخیره")');
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.resolve('.playwright-cli/r3-desktop-home.png') });

  // Mobile viewport
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const mPass = await mobilePage.$$('input[type="password"]');
  if (mPass.length >= 1) {
    await mPass[0].fill('StrongPassphrase!2026');
    if (mPass.length >= 2) await mPass[1].fill('StrongPassphrase!2026');
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForSelector('header');
  }
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.resolve('.playwright-cli/r3-mobile-home.png') });

  await browser.close();
  console.log('R3 captures completed successfully!');
}

capture().catch(console.error);
