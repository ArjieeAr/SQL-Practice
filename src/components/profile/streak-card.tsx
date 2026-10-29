import { Flame, Trophy } from "lucide-react";

const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

export function StreakCard({ current, longest }: { current: number; longest: number }) {
  return (
    <section className="border-border bg-surface flex flex-col gap-5 rounded-lg border p-5">
      <h2 className="text-muted text-sm font-medium">Streak</h2>
      <div className="flex items-center gap-3">
        <Flame className={`size-9 ${current > 0 ? "text-medium" : "text-muted"}`} aria-hidden />
        <div>
          <p className="text-3xl font-semibold tabular-nums">{days(current)}</p>
          <p className="text-muted text-sm">
            {current > 0
              ? "Current streak. Get an Accepted every day to keep it going."
              : "No active streak. Get an Accepted today to start one."}
          </p>
        </div>
      </div>
      <p className="text-muted flex items-center gap-2 text-sm">
        <Trophy className="size-4" aria-hidden />
        Longest: <span className="text-foreground tabular-nums">{days(longest)}</span>
      </p>
      <p className="text-muted text-xs">
        A day counts when you get at least one Accepted submission (UTC days).
      </p>
    </section>
  );
}
