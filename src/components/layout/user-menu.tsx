import { LogOut } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

import { SignInLink } from "./sign-in-link";

/** Reads the session (request-time data), so render it inside a <Suspense> boundary. */
export async function UserMenu() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return <SignInLink />;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", auth.claims.sub)
    .maybeSingle();
  const name = profile?.display_name || auth.claims.email || "Account";

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/profile"
        title="Your profile"
        className="hover:text-accent flex items-center gap-2 text-sm transition-colors"
      >
        <span
          aria-hidden
          className="bg-accent/20 text-accent flex size-7 items-center justify-center rounded-full text-xs font-semibold uppercase"
        >
          {name.slice(0, 1)}
        </span>
        <span className="hidden max-w-40 truncate sm:inline">{name}</span>
        <span className="sr-only sm:hidden">Your profile</span>
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          title="Sign out"
          className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <LogOut className="size-4" />
          <span className="sr-only sm:not-sr-only">Sign out</span>
        </button>
      </form>
    </div>
  );
}
