import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "playwright-report", "test-results", "docs", "public"]),

  // TypeScript everywhere (app, tests and config files)
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
  },

  // React rules only for the application source
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },

  // Node-side TypeScript (configs and Playwright specs)
  {
    files: ["playwright.config.ts", "vite.config.ts", "tests_e2e/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  // Node scripts (profiling, report copy)
  {
    files: ["scripts/**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
]);
