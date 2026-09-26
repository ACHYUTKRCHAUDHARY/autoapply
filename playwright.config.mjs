import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  reporter: 'list',
  retries: 0,
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
});
