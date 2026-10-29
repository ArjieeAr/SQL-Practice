/**
 * Create (or reset) the account the Playwright solve-flow test signs in with.
 *
 *   npm run e2e:user     reads E2E_USER_EMAIL / E2E_USER_PASSWORD from .env.local
 *
 * Uses the admin API so the account is confirmed immediately (no email round trip). Use a
 * throwaway address and password: this account exists only for tests.
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: secretKey } = process.env;
const { E2E_USER_EMAIL: email, E2E_USER_PASSWORD: password } = process.env;

if (!url || !secretKey || !email || !password) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, E2E_USER_EMAIL and E2E_USER_PASSWORD.",
  );
  process.exit(1);
}

const admin = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: created, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "E2E Test User" },
});

if (!error) {
  console.log(`Created test user ${created.user.email}.`);
  process.exit(0);
}

if (!/already (been )?registered|already exists/i.test(error.message)) {
  console.error(`Could not create the test user: ${error.message}`);
  process.exit(1);
}

// Already exists: reset its password so it matches .env.local.
const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error(`Could not look up the existing user: ${listError.message}`);
  process.exit(1);
}
const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!existing) {
  console.error("Supabase says the user exists, but it wasn't found.");
  process.exit(1);
}
const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
  password,
  email_confirm: true,
});
if (updateError) {
  console.error(`Could not reset the test user's password: ${updateError.message}`);
  process.exit(1);
}
console.log(`Test user ${email} already existed; password reset to match .env.local.`);
process.exit(0);
