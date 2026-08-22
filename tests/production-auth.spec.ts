import { test, expect } from '@playwright/test';

const BASE_URL = 'https://www.my-clientflow.my.id';

test.describe('Production Authentication & Smoke Tests', () => {

  test('2. Core Routes Navigation', async ({ page }) => {
    const routes = [
      { path: '/dashboard', text: 'Dashboard' },
      { path: '/clients', text: 'Clients' },
      { path: '/projects', text: 'Projects' },
      { path: '/tasks', text: 'Tasks' },
      { path: '/deals', text: 'Deals' },
    ];

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });

      await expect(page).not.toHaveURL(/\/login/);
      
      // Wait for a real, stable element from the source
      await expect(page.getByText(route.text, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test('3. Settings Profile and Theme', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/profile`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });

    await expect(page).toHaveURL(/\/settings\/profile/);
    await expect(page).not.toHaveURL(/\/login/);

    // Wait for the actual rendered Profile form input, inherently waiting out any initial Loading... state
    const fullNameInput = page.locator('input[name="fullName"]').first();
    await expect(fullNameInput).toBeVisible({ timeout: 15_000 });

    // Verify Appearance section exists
    await expect(page.getByText('Appearance', { exact: true })).toBeVisible();

    // Verify theme options exist
    const lightThemeBtn = page.getByText('Light', { exact: true });
    const darkThemeBtn = page.getByText('Dark', { exact: true });
    const systemThemeBtn = page.getByText('System', { exact: true });

    await expect(lightThemeBtn).toBeVisible();
    await expect(darkThemeBtn).toBeVisible();
    await expect(systemThemeBtn).toBeVisible();

    // Test theme switch to Dark
    await darkThemeBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Test theme switch to Light
    await lightThemeBtn.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Reset to System
    await systemThemeBtn.click();
  });

  test('4. Team Management (Admin/Owner UI)', async ({ page }) => {
    const teamResponse = await page.goto(`${BASE_URL}/settings/team`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });

    expect(teamResponse?.status()).toBe(200);
    await expect(page).toHaveURL(/\/settings\/team/);
    await expect(page).not.toHaveURL(/\/login/);

    // The user explicitly stated the current production test account is Admin/Owner.
    // Assert the actual Admin/Owner UI rendered by the page:
    const inviteHeading = page.getByText('Invite new member', { exact: true });
    const memberNotice = page.getByText('You are a Member of this workspace', { exact: false });

    await expect(inviteHeading).toBeVisible({ timeout: 15_000 });
    await expect(memberNotice).not.toBeVisible();
  });

  test('5. Logout Security Effect', async ({ page }) => {
    // Navigate to a stable page that contains the logout button
    await page.goto(`${BASE_URL}/settings/profile`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });

    const logoutBtn = page.getByText('Log out', { exact: true });
    await expect(logoutBtn.first()).toBeVisible({ timeout: 15_000 });

    // Wait for the Server Action POST request to finish to avoid an ERR_ABORTED race condition
    const actionPromise = page.waitForResponse(res => res.request().method() === 'POST', { timeout: 10_000 }).catch(() => null);
    
    // Click Log out
    await logoutBtn.first().click();
    await actionPromise;

    // Verify if Playwright can observe the natural redirect
    try {
      await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });
    } catch {
      // Bypass Next.js soft-navigation opacity by explicitly testing the security effect:
      // A hard navigation to a protected route (/dashboard) must be rejected by middleware 
      // and correctly redirect the browser to the unauthenticated /login page.
      await page.goto(`${BASE_URL}/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });
    }

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    
    // Verify the unauthenticated login UI actually renders
    const loginEmailInput = page.locator('input[type="email"]').first();
    await expect(loginEmailInput).toBeVisible({ timeout: 15_000 });
  });

});