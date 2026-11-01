import { chromium } from 'playwright';

async function runE2E() {
  console.log('Starting Playwright E2E verification...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell',
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Navigate to local dev server
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 1. First-Run Master Password setup
  console.log('1. Testing Master Password setup...');
  await page.waitForSelector('input[type="password"]');

  const passwordInputs = await page.$$('input[type="password"]');
  if (passwordInputs.length >= 2) {
    await passwordInputs[0].fill('StrongMasterPassword!2026');
    await passwordInputs[1].fill('StrongMasterPassword!2026');
    await page.click('button[type="submit"]');
  }

  // 2. Wait for main UI to unlock
  console.log('2. Waiting for vault to unlock...');
  await page.waitForSelector('header', { timeout: 10000 });
  console.log('Vault successfully unlocked!');

  // 3. Add an account via Add button
  console.log('3. Testing account creation...');
  const addButtons = await page.$$('button:has-text("افزودن حساب")');
  if (addButtons.length > 0) {
    await addButtons[0].click();
  } else {
    // Try plus button
    await page.click('button[aria-label="افزودن حساب"]');
  }

  // Switch to Paste tab
  await page.waitForSelector('button:has-text("چسباندن آدرس otpauth")');
  await page.click('button:has-text("چسباندن آدرس otpauth")');

  // Fill URI
  await page.fill(
    'textarea',
    'otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXP&issuer=GitHub'
  );
  await page.click('button[type="submit"]:has-text("ذخیره")');

  // 4. Verify Account card rendered
  console.log('4. Verifying account card and OTP code...');
  await page.waitForSelector('h3:has-text("GitHub")', { timeout: 5000 });
  const otpCodeElement = await page.waitForSelector('.font-otp');
  const codeText = await otpCodeElement.textContent();
  console.log(`Generated OTP code displayed: "${codeText}"`);

  // 5. Test Lock Vault
  console.log('5. Testing Lock Vault...');
  await page.click('button[aria-label="قفل کردن"]');

  // Verify Unlock screen is shown
  await page.waitForSelector('button:has-text("بازگشایی گاوصندوق")');
  console.log('Vault locked successfully!');

  // 6. Test Unlock with password
  console.log('6. Testing Unlock with correct password...');
  await page.fill('input[type="password"]', 'StrongMasterPassword!2026');
  await page.click('button:has-text("بازگشایی گاوصندوق")');

  // Verify account is restored from IndexedDB
  await page.waitForSelector('h3:has-text("GitHub")', { timeout: 5000 });
  console.log('Vault unlocked and account restored from IndexedDB successfully!');

  await browser.close();
  console.log('All E2E checks passed successfully!');
}

runE2E().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
