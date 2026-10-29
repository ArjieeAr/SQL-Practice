import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/types/database";

export type ProfileStats = Database["public"]["Functions"]["get_my_stats"]["Returns"][number];

export type RecentSubmission = Pick<
  Tables<"submissions">,
  "id" | "status" | "runtime_ms" | "passed_cases" | "total_cases" | "created_at"
> & { problem: Pick<Tables<"problems">, "number" | "slug" | "title"> };

export interface ProfilePageData {
  displayName: string | null;
  email: string | null;
  memberSince: string;
  stats: ProfileStats;
  recent: RecentSubmission[];
}

const EMPTY_STATS: ProfileStats = {
  easy_solved: 0,
  easy_total: 0,
  medium_solved: 0,
  medium_total: 0,
  hard_solved: 0,
  hard_total: 0,
  current_streak: 0,
  longest_streak: 0,
};

/**
 * Everything the profile page shows, for the signed-in user; null when signed out.
 * All three reads go through the user's own client, so RLS scopes them to their data, and
 * they run in parallel.
 */
export async function getProfilePageData(): Promise<ProfilePageData | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return null;
  const userId = auth.claims.sub;

  const [profile, stats, recent] = await Promise.all([
    supabase.from("profiles").select("display_name, created_at").eq("id", userId).maybeSingle(),
    supabase.rpc("get_my_stats"),
    supabase
      .from("submissions")
      .select(
        "id, status, runtime_ms, passed_cases, total_cases, created_at, problem:problems!inner(number, slug, title)",
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  for (const { error } of [profile, stats, recent]) {
    if (error) throw new Error(`Failed to load profile: ${error.message}`);
  }

  return {
    displayName: profile.data?.display_name ?? null,
    email: typeof auth.claims.email === "string" ? auth.claims.email : null,
    memberSince: profile.data?.created_at ?? new Date().toISOString(),
    stats: stats.data?.[0] ?? EMPTY_STATS,
    recent: recent.data ?? [],
  };
}
