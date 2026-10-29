import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for GitHub sign-in and email-confirmation links. Supabase redirects here with a
 * one-time `code` (PKCE flow), which we exchange for a session cookie before continuing.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const message = "Could not sign you in. The link may have expired; please try again.";
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
}
