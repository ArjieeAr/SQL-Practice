"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/browser";

interface ProblemSessionValue {
  /** undefined while the session is being read; null when signed out. */
  user: User | null | undefined;
  /** Bumped after every submission so the history tab knows to refetch. */
  submissionsVersion: number;
  notifySubmitted: () => void;
  /** Replace the editor's contents (e.g. with a past submission). */
  openInEditor: (sql: string) => void;
  registerEditor: (setSql: ((sql: string) => void) | null) => void;
}

const ProblemSessionContext = createContext<ProblemSessionValue | null>(null);

/**
 * Shared client state for one problem page: the description column (submission history) and the
 * editor column are siblings, so they talk through this context instead of prop drilling.
 *
 * The user here only drives the UI (showing "Submit" vs "Sign in"). The submit route verifies the
 * session on the server, so tampering with this state gains nothing.
 */
export function ProblemSession({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [submissionsVersion, setSubmissionsVersion] = useState(0);
  const editorSetter = useRef<((sql: string) => void) | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // getSession reads the cookie locally, which is fine for deciding what to render.
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const notifySubmitted = useCallback(() => setSubmissionsVersion((v) => v + 1), []);
  const openInEditor = useCallback((sql: string) => editorSetter.current?.(sql), []);
  const registerEditor = useCallback((setSql: ((sql: string) => void) | null) => {
    editorSetter.current = setSql;
  }, []);

  const value = useMemo(
    () => ({ user, submissionsVersion, notifySubmitted, openInEditor, registerEditor }),
    [user, submissionsVersion, notifySubmitted, openInEditor, registerEditor],
  );
  return <ProblemSessionContext value={value}>{children}</ProblemSessionContext>;
}

export function useProblemSession() {
  const value = useContext(ProblemSessionContext);
  if (!value) throw new Error("useProblemSession must be used inside <ProblemSession>");
  return value;
}
