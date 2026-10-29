/**
 * Capture the README screenshots from a running app.
 *
 *   npm run build && npm start     (in another terminal; a production build has no dev overlay)
 *   npm run screenshots            writes docs/screenshots/*.png
 *
 * Signed-in shots (submission result, profile) use the E2E test account when
 * E2E_USER_EMAIL / E2E_USER_PASSWORD are set; otherwise they're skipped.
 */
import { mkdir } from "node:fs/promises";

import { chromium, type Page } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Fine: signed-in screenshots are just skipped.
}

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT = "docs/screenshots";
const PROBLEM = "/problems/running-balance";
const SOLUTION = `SELECT account_id,
       id AS transaction_id,
       amount,
       SUM(amount) OVER (PARTITION BY account_id ORDER BY posted_at, id) AS balance
FROM transactions
ORDER BY account_id, posted_at, id;`;

/**
 * Set the editor text through Monaco's API (loaded globally from its CDN). Typing multi-line text
 * would trigger auto-indent and produce a staircase, which is fine for tests but not for docs.
 */
async function setQuery(page: Page, sql: string) {
  await page.locator(".monaco-editor").first().waitFor({ timeout: 60_000 });
  await page.evaluate((text) => {
    const { monaco } = window as unknown as {
      monaco: { editor: { getEditors(): { setValue(v: string): void }[] } };
    };
    monaco.editor.getEditors()[0].setValue(text);
  }, sql);
  await page.waitForTimeout(100); // let React pick up the change before Run/Submit reads it
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(400); // let fonts and transitions settle
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ${OUT}/${name}.png`);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: "dark",
});
const page = await context.newPage();

console.log("Capturing screenshots:");
await page.goto(`${BASE}/`);
await shot(page, "home");

await page.goto(`${BASE}/problems`);
await page.getByRole("radio", { name: "Medium" }).click();
await shot(page, "problems");

await page.goto(`${BASE}${PROBLEM}`);
await page.getByText("Postgres ready").waitFor({ timeout: 60_000 });
await setQuery(page, SOLUTION);
await page.getByRole("button", { name: "Run", exact: true }).click();
await page.getByText("Matches the expected output").waitFor();
await shot(page, "problem-run");

await page.getByRole("tab", { name: "Sample data" }).click();
await shot(page, "sample-data");

const { E2E_USER_EMAIL: email, E2E_USER_PASSWORD: password } = process.env;
if (email && password) {
  await page.goto(`${BASE}/login?next=${encodeURIComponent(PROBLEM)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`**${PROBLEM}`);
  await setQuery(page, SOLUTION);
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByText("Passed all 3 hidden test cases").waitFor({ timeout: 60_000 });
  await shot(page, "submission");

  await page.goto(`${BASE}/profile`);
  await page.getByText("Recent submissions").waitFor();
  await shot(page, "profile");
} else {
  console.log("  (skipping signed-in screenshots: E2E_USER_EMAIL / E2E_USER_PASSWORD not set)");
}

await browser.close();
