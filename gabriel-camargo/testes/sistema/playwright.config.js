// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,               // a jornada altera dados compartilhados do SUT
  retries: 0,               // falha intermitente deve aparecer, não ser escondida
  reporter: [
    ['list'],
    ['junit', { outputFile: '../../resultados/sistema-junit.xml' }],
    ['html', { outputFolder: '../../resultados/playwright-html', open: 'never' }],
  ],
  use: {
    baseURL: (process.env.OHRM_URL ?? 'http://localhost:8300/web/index.php').replace(/\/?$/, '/'),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1366, height: 800 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 } } }],
});
