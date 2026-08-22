import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'authenticated',
      testMatch: /.*production-auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/owner.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'public',
      testMatch: /.*production-smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});