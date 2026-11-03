/**
 * Make an existing account an admin, or take that away.
 *
 *   npm run admin:grant -- someone@example.com
 *   npm run admin:grant -- someone@example.com --revoke
 *
 * The person must have signed up already. This is the only way to change a role: clients can't
 * write profiles.role, so there's no way to grant it from the site.
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: secretKey } = process.env;
const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const email = args.find((arg) => !arg.startsWith("--"));

if (!url || !secretKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (see .env.example).");
  process.exit(1);
}
if (!email) {
  console.error("Usage: npm run admin:grant -- <email> [--revoke]");
  process.exit(1);
}

const admin = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error(`Could not look up the user: ${listError.message}`);
  process.exit(1);
}
const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No account found for ${email}. They need to sign up first.`);
  process.exit(1);
}

const role = revoke ? "user" : "admin";
const { error } = await admin.from("profiles").update({ role }).eq("id", user.id);
if (error) {
  console.error(`Could not update the role: ${error.message}`);
  process.exit(1);
}
console.log(`${email} is now: ${role}.`);
process.exit(0);
