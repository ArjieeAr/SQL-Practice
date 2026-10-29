"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth/redirect";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error?: string;
  message?: string;
}

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Passwords are at least 8 characters."),
  next: z.string().optional(),
});

/** Where Supabase should send people back to after email confirmation or GitHub sign-in. */
async function callbackUrl(next: string) {
  // The request's own origin works on localhost, previews and production alike;
  // Supabase only honours it if it's in the project's allowed redirect URLs.
  const origin = (await headers()).get("origin") ?? publicEnv.NEXT_PUBLIC_SITE_URL;
  return `${origin}/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`;
}

function parseCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = parseCredentials(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  redirect(safeNextPath(parsed.data.next));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = parseCredentials(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: await callbackUrl(parsed.data.next ?? "") },
  });
  if (error) return { error: error.message };

  // With email confirmation turned off, Supabase signs the user in immediately.
  if (data.session) redirect(safeNextPath(parsed.data.next));
  return { message: "Check your email for a confirmation link to finish signing up." };
}

export async function signInWithGitHub(formData: FormData) {
  const next = String(formData.get("next") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: await callbackUrl(next) },
  });
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "GitHub sign-in failed.")}`);
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/problems");
}
