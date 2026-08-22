import { test, expect } from '@playwright/test';

const BASE_URL = 'https://www.my-clientflow.my.id';

test('ClientFlow production loads', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/ClientFlow/i);
});

test('Login page loads', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15000 });
});

test('Dashboard is protected', async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login/);
});