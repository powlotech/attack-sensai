import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  webServer: { command: 'npm run preview -- --port 4173', url: 'http://localhost:4173/attack-learner/', reuseExistingServer: true },
  use: { baseURL: 'http://localhost:4173/attack-learner/', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
})
