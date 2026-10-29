import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-border bg-surface/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
          <span className="text-accent">SELECT</span> practice
        </Link>
        <nav className="text-muted flex items-center gap-4 text-sm">
          <Link href="/problems" className="hover:text-foreground transition-colors">
            Problems
          </Link>
        </nav>
      </div>
    </header>
  );
}
