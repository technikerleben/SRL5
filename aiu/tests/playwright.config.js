import { defineConfig, devices } from '@playwright/test';

/* Der Server liefert das Repository-Wurzelverzeichnis aus, damit der
   <base href="/aiu/"> aus index.html unveraendert funktioniert. */
export default defineConfig({
  testDir: '.',
  testMatch: 'visual.spec.js',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' }
  },
  use: {
    baseURL: 'http://127.0.0.1:4173/aiu/',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'ipad-quer', use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 } } },
    { name: 'iphone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: false } }
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory ../..',
    port: 4173,
    reuseExistingServer: true,
    stdout: 'ignore'
  }
});
