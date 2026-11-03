import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type AccountRole = Enums<"account_role">;

export interface Viewer {
  id: string;
  role: AccountRole;
}

/**
 * The signed-in user and their role; null when signed out. The role is read from the database on
 * every request rather than kept in the JWT, so revoking it takes effect immediately. If it can't
 * be read, the viewer is treated as a regular user.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.claims.sub)
    .maybeSingle();
  return { id: auth.claims.sub, role: profile?.role ?? "user" };
});

/**
 * Throws unless the viewer is an admin. Every function that uses the service role for an admin
 * calls this itself, so a page or action that forgets its own check still can't leak or write.
 */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") throw new Error("Admin access required.");
  return viewer;
}

/** Page guard: sends signed-out visitors to sign in, and hides the page from everyone else. */
export async function requireAdminPage(path: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (viewer.role !== "admin") notFound();
  return viewer;
}
