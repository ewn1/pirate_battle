/**
 * [SAVE REPORTS]
 * Copies the Playwright HTML report into docs/reports/playwright/ so it can be
 * committed as evidence. Run after `npm run test:e2e`.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

const source = "playwright-report";
const target = "docs/reports/playwright";

if (!existsSync(source)) {
  console.error("No playwright-report/ folder. Run `npm run test:e2e` first.");
  process.exit(1);
}
mkdirSync("docs/reports", { recursive: true });
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`Copied ${source} -> ${target}`);
