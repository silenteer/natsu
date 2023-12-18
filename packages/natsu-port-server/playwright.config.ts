/* eslint-disable @typescript-eslint/no-var-requires */
import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  // workers: process.env.CI ? 4 : 1,
  workers: 1,
  maxFailures: process.env.CI ? 10 : undefined,
  reporter: [
    ['json', { outputFile: './reports/result.json' }],
    ['junit', { outputFile: './reports/junit.xml' }],
    ['list', { printSteps: true }],
  ],
  // retries: process.env.CI ? 1 : undefined,
  retries: 0,
  testDir: './__tests__/integration',
  outputDir: './artifact',
  timeout: 3 * 60 * 1000,
  testMatch: /.*\.spec\.ts/,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    browserName: 'chromium',
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    navigationTimeout: 0,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: null,
  },
  webServer: [
    {
      command: 'tsx ./__tests__/server.ts',
      port: 8080,
      timeout: 3 * 60 * 1000,
      reuseExistingServer: false,
      // stdout: 'pipe',
      // stderr: 'pipe',
    },
  ],
  projects: [
    {
      name: 'natsu-port-server',
      testMatch: 'natsu-port-server.spec.ts',
    },
  ],
};

export default config;
