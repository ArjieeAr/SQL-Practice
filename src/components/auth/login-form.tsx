"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";

import { signIn, signInWithGitHub, signUp, type AuthFormState } from "@/app/login/actions";
import { GitHubIcon } from "@/components/icons/github-icon";

type Mode = "sign-in" | "sign-up";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const callbackError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("sign-in");
  const [signInState, signInAction, signingIn] = useActionState<AuthFormState, FormData>(
    signIn,
    {},
  );
  const [signUpState, signUpAction, signingUp] = useActionState<AuthFormState, FormData>(
    signUp,
    {},
  );
  const state = mode === "sign-in" ? signInState : signUpState;
  const pending = signingIn || signingUp;
  const error = state.error ?? callbackError;

  return (
    <div className="flex flex-col gap-6">
      <form action={signInWithGitHub}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="border-border bg-surface-raised hover:bg-surface inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors"
        >
          <GitHubIcon className="size-4" /> Continue with GitHub
        </button>
      </form>

      <div className="text-muted flex items-center gap-3 text-xs">
        <span className="bg-border h-px flex-1" /> or with email{" "}
        <span className="bg-border h-px flex-1" />
      </div>

      <form
        action={mode === "sign-in" ? signInAction : signUpAction}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1.5 text-sm">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="border-border bg-surface focus:border-accent h-10 rounded-md border px-3 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Password
          <input
            name="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            required
            className="border-border bg-surface focus:border-accent h-10 rounded-md border px-3 outline-none"
          />
        </label>

        {error && (
          <p role="alert" className="text-hard text-sm">
            {error}
          </p>
        )}
        {state.message && (
          <p role="status" className="text-easy text-sm">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="bg-accent text-accent-foreground inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="text-muted text-center text-sm">
        {mode === "sign-in" ? "New here? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          className="text-accent hover:underline"
        >
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
