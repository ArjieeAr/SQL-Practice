"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** "Sign in" that brings the user back to the page they were on. */
export function SignInLink() {
  const pathname = usePathname();
  const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";

  return (
    <Link
      href={`/login${next}`}
      className="border-border hover:bg-surface-raised rounded-md border px-3 py-1.5 text-sm transition-colors"
    >
      Sign in
    </Link>
  );
}
