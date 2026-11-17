const {defineConfig, devices} = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: {timeout: 12000},
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['junit', {outputFile: '../resultados/playwright-junit.xml'}],
    ['html', {open: 'never', outputFolder: 'playwright-report'}]],
  use: {
    baseURL: (process.env.OHRM_BASE_URL || 'http://localhost:8200/web/index.php') + '/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
  },
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
});
