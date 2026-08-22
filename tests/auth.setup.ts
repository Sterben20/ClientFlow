import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/owner.json');
const BASE_URL = 'https://www.my-clientflow.my.id';

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD environment variables are required.');
  }

  await page.goto(`${BASE_URL}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 15_000,
  });

  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  await expect(emailInput).toBeVisible({ timeout: 10_000 });

  // SECURITY FIX: Prevent Playwright from clicking Submit before React hydrates,
  // which causes a native HTML GET form submission leaking credentials in the URL.
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form && !form.getAttribute('method')) {
      form.setAttribute('method', 'POST');
    }
  });

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();

  await page.waitForURL(/\/(workspaces|dashboard)/, { timeout: 15_000 });

  if (page.url().includes('/workspaces')) {
    await expect(page.getByText('Select Workspace')).toBeVisible();
    const enterButton = page.getByRole('button', { name: /enter workspace/i }).first();
    await expect(enterButton).toBeVisible();
    await enterButton.click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  }

  await expect(page).toHaveURL(/\/dashboard/);

  // Save the authenticated session state
  await page.context().storageState({ path: authFile });
});
