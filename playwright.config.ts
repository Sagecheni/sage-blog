import { defineConfig } from "@playwright/test";

// 冒烟测试跑在构建产物上（astro preview 服务 dist/），
// 先 npm run build 再 npm run test:e2e
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4321",
  },
  webServer: {
    command: "npm run preview",
    port: 4321,
    reuseExistingServer: !process.env.CI,
  },
});
