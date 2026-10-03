/**
 * [PLAYWRIGHT CONFIG]
 * Projects (all Chromium):
 *   desktop - main flows on a desktop viewport
 *   mobile  - the same flows on a touch device in landscape (Pixel 7)
 *   visual  - visual regression baselines (desktop only)
 *
 * The suite runs against the OPTIMISED build (`build` + `preview`), exactly
 * what is deployed. Every test starts from a fresh browser context (empty
 * localStorage / sessionStorage), so tests never share state.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "./tests_e2e",
  outputDir: "./test-results",
  // One baseline per screenshot, independent of the operating system.
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 120_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" },
  },

  // HTML report + list in the terminal; traces are kept for failures.
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["list"],
  ],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "en-US",
    timezoneId: "UTC",
    launchOptions: {
      args: [
        "--enable-unsafe-swiftshader",
        "--ignore-gpu-blocklist",
        "--autoplay-policy=no-user-gesture-required",
      ],
    },
  },

  projects: [
    {
      name: "desktop",
      testIgnore: /visual\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "mobile",
      testIgnore: /visual\.spec\.ts/,
      use: { ...devices["Pixel 7 landscape"] },
    },
    {
      name: "visual",
      testMatch: /visual\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer: {
    command: "npm run build && npm run preview",
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
