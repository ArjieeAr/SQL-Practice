import { expect, test, type Page } from "@playwright/test";

const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

// Verifying boots a WASM Postgres per dataset, and a cold server builds its snapshot first.
test.setTimeout(180_000);

async function signIn(page: Page, email: string, password: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next}$`));
}

test.describe("admin access", () => {
  test("signed-out visitors are sent to sign in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
  });

  test("the admin API looks like it doesn't exist to signed-out visitors", async ({ request }) => {
    const response = await request.post("/api/admin/problems", { data: { intent: "verify" } });
    expect(response.status()).toBe(404);
  });

  test("regular users can't see the admin area", async ({ page }) => {
    test.skip(!USER_EMAIL || !USER_PASSWORD, "Set E2E_USER_EMAIL / E2E_USER_PASSWORD");

    await signIn(page, USER_EMAIL!, USER_PASSWORD!, "/profile");
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);

    await page.goto("/admin");
    await expect(page.getByText("0 rows returned")).toBeVisible();

    const response = await page.request.post("/api/admin/problems", { data: { intent: "verify" } });
    expect(response.status()).toBe(404);
  });
});

test.describe("proposal to published problem", () => {
  // Publishes a real problem and adds a proposal, so only run it against a test project.
  test.skip(
    !USER_EMAIL || !USER_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD,
    "Set E2E_USER_* and E2E_ADMIN_* (see .env.example)",
  );

  test("a user proposes, an admin fixes it and publishes, and anyone can open it", async ({
    browser,
  }) => {
    const title = `E2E problem ${Date.now()}`;
    const slug = title.toLowerCase().replaceAll(" ", "-");

    // A user sends in an idea.
    const userContext = await browser.newContext();
    const user = await userContext.newPage();
    await signIn(user, USER_EMAIL!, USER_PASSWORD!, "/proposals/new");
    await user.getByLabel("Title").fill(title);
    await user.getByRole("button", { name: "JOINs" }).click();
    await user.getByLabel("What should the query do?").fill("Return every **value**.");
    await user.getByRole("button", { name: "Send proposal" }).click();
    await expect(user).toHaveURL(/\/proposals$/);
    await expect(user.getByRole("listitem").filter({ hasText: title })).toContainText("In review");

    // An admin starts from it and gets told what's wrong.
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await signIn(admin, ADMIN_EMAIL!, ADMIN_PASSWORD!, "/admin/proposals");
    await admin.getByRole("link", { name: `Start from ${title}` }).click();
    await expect(admin.getByLabel("Title")).toHaveValue(title);
    await expect(admin.getByLabel("URL slug")).toHaveValue(slug);

    await admin.getByRole("button", { name: "Publish" }).click();
    await expect(admin.getByRole("alert")).toContainText("Write the schema.");

    // Broken SQL is explained, not published.
    await admin.getByLabel("Schema").fill("CREATE TABLE t (x int);");
    await admin.getByLabel("Sample data").fill("INSERT INTO t VALUES (1), (2);");
    await admin.getByLabel("Reference solution").fill("SELECT nope FROM t");
    for (const name of ["Normal rows", "Empty table"]) {
      await admin.getByRole("button", { name: "Add test case" }).click();
      const index = name === "Normal rows" ? 1 : 2;
      await admin.getByLabel(`Test case ${index} name`).fill(name);
      await admin
        .getByLabel(`Test case ${index} SQL`)
        .fill(index === 1 ? "INSERT INTO t VALUES (3);" : "");
    }
    await admin.getByRole("button", { name: "Verify" }).click();
    await expect(admin.getByRole("alert")).toContainText(/reference failed on sample data/, {
      timeout: 60_000,
    });

    // Fixed, it verifies and publishes.
    await admin.getByLabel("Reference solution").fill("SELECT x FROM t");
    await admin.getByRole("button", { name: "Verify" }).click();
    await expect(admin.getByText("Ready to publish")).toBeVisible({ timeout: 60_000 });

    await admin.getByRole("button", { name: "Publish" }).click();
    await expect(admin).toHaveURL(/\/admin\/problems\/[0-9a-f-]{36}$/, { timeout: 60_000 });
    await expect(admin.getByText("Published.", { exact: false }).first()).toBeVisible();

    // It's live for signed-out visitors straight away.
    const visitorContext = await browser.newContext();
    const visitor = await visitorContext.newPage();
    await visitor.goto("/problems");
    await expect(visitor.getByRole("link", { name: title })).toBeVisible();
    await visitor.goto(`/problems/${slug}`);
    await expect(visitor.getByRole("heading", { name: title })).toBeVisible();

    // The proposer can see it went through.
    await user.reload();
    await expect(user.getByRole("listitem").filter({ hasText: title })).toContainText("Published");

    // Clean up what the rest of the site shows; there's deliberately no delete.
    await admin.goto("/admin");
    await admin.getByRole("button", { name: `Unpublish ${title}` }).click();
    await expect(admin.getByRole("button", { name: `Unpublish ${title}` })).toHaveCount(0);
    await visitor.goto("/problems");
    await expect(visitor.getByRole("link", { name: title })).toHaveCount(0);

    await Promise.all([userContext.close(), adminContext.close(), visitorContext.close()]);
  });
});
