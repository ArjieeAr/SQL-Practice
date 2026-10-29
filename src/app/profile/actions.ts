"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export interface DisplayNameState {
  error?: string;
  saved?: boolean;
}

const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(64, "Keep it under 64 characters.");

export async function updateDisplayName(
  _prev: DisplayNameState,
  formData: FormData,
): Promise<DisplayNameState> {
  const parsed = displayNameSchema.safeParse(formData.get("displayName"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: "Your session expired. Sign in again." };

  // RLS restricts this to the user's own row, and the column grant to display_name/avatar_url.
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", auth.claims.sub);
  if (error) return { error: error.message };

  refresh(); // re-render the page and header with the new name
  return { saved: true };
}
