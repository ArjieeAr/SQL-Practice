import { expect, test, type Page } from "@playwright/test";

const PROBLEM = "/problems/customers-without-orders";
const SOLUTION = `SELECT c.id AS customer_id, c.name
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)`;
// The classic mistake this problem is built around: NOT IN returns nothing when the
// subquery contains a NULL (guest checkouts).
const NOT_IN_PITFALL = `SELECT id AS customer_id, name
FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders)`;

// Booting WASM Postgres and loading Monaco from its CDN can be slow on a cold CI runner.
test.setTimeout(120_000);

/** Replace the editor contents. insertText avoids Monaco's auto-closing of brackets. */
async function setQuery(page: Page, sql: string) {
  const editor = page.locator(".monaco-editor").first();
  await editor.waitFor({ timeout: 60_000 });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(sql);
}

test.describe("solve flow", () => {
  test("anyone can run queries against the sample data", async ({ page }) => {
    await page.goto(PROBLEM);
    await expect(page.getByText("Postgres ready")).toBeVisible({ timeout: 60_000 });

    await setQuery(page, NOT_IN_PITFALL);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByText("Differs from the expected output")).toBeVisible();
    await expect(page.getByText("Expected 2 rows, got 0.")).toBeVisible();

    await setQuery(page, SOLUTION);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByText("Matches the expected output")).toBeVisible();

    // Signed-out visitors can Run but are asked to sign in before submitting.
    await expect(page.getByRole("link", { name: "Sign in to submit" })).toBeVisible();
  });

  test("a signed-in user can submit a solution and see it accepted", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    test.skip(!email || !password, "Set E2E_USER_EMAIL / E2E_USER_PASSWORD (see npm run e2e:user)");

    await page.goto(`/login?next=${encodeURIComponent(PROBLEM)}`);
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${PROBLEM}$`));

    await setQuery(page, SOLUTION);
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(page.getByText("Passed all 3 hidden test cases")).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole("tab", { name: "Submissions" }).click();
    await expect(
      page.getByRole("tabpanel", { name: "Submissions" }).getByText("Accepted").first(),
    ).toBeVisible();
  });
});
