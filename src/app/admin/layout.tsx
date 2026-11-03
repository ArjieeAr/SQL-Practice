import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false },
};

/** Just the shared navigation, which reveals nothing. Each page checks the viewer's role itself. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <nav aria-label="Admin" className="text-muted flex items-center gap-4 text-sm">
        <Link href="/admin" className="hover:text-foreground transition-colors">
          All problems
        </Link>
        <Link href="/admin/proposals" className="hover:text-foreground transition-colors">
          Proposals
        </Link>
      </nav>
      {children}
    </section>
  );
}
