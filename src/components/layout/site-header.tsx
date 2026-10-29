import Link from "next/link";
import { Suspense } from "react";

import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="border-border bg-surface/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="flex h-14 items-center gap-6 px-4">
        <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
          <span className="text-accent">SELECT</span> practice
        </Link>
        <nav className="text-muted flex items-center gap-4 text-sm">
          <Link href="/problems" className="hover:text-foreground transition-colors">
            Problems
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {/* The header is part of every page's static shell; only the user menu waits on the
              session. A neutral placeholder avoids flashing "Sign in" at signed-in users. */}
          <Suspense fallback={<div className="h-8 w-20" aria-hidden />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
