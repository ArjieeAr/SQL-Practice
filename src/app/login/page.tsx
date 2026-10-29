import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to submit</h1>
        <p className="text-muted text-sm">
          Anyone can browse and run queries. An account saves your submissions and progress.
        </p>
      </header>
      {/* The form reads ?next= and ?error= from the URL, which is request-time data. */}
      <Suspense fallback={<div className="bg-surface h-72 animate-pulse rounded-md" />}>
        <LoginForm />
      </Suspense>
    </section>
  );
}
