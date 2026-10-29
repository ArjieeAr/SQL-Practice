import { DIFFICULTY_LABEL } from "@/components/problems/difficulty-badge";
import type { ProfileStats } from "@/lib/data/profile";

const BAR: Record<"easy" | "medium" | "hard", string> = {
  easy: "bg-easy",
  medium: "bg-medium",
  hard: "bg-hard",
};

export function SolvedCard({ stats }: { stats: ProfileStats }) {
  const rows = (["easy", "medium", "hard"] as const).map((d) => ({
    difficulty: d,
    solved: stats[`${d}_solved`],
    total: stats[`${d}_total`],
  }));
  const solved = rows.reduce((n, r) => n + r.solved, 0);
  const total = rows.reduce((n, r) => n + r.total, 0);

  return (
    <section className="border-border bg-surface flex flex-col gap-5 rounded-lg border p-5">
      <header className="flex items-baseline justify-between">
        <h2 className="text-muted text-sm font-medium">Solved</h2>
        <p className="tabular-nums">
          <span className="text-3xl font-semibold">{solved}</span>
          <span className="text-muted"> / {total}</span>
        </p>
      </header>
      <ul className="flex flex-col gap-3">
        {rows.map(({ difficulty, solved, total }) => (
          <li key={difficulty} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span>{DIFFICULTY_LABEL[difficulty]}</span>
              <span className="text-muted tabular-nums">
                {solved} / {total}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`${DIFFICULTY_LABEL[difficulty]} problems solved`}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={solved}
              className="bg-surface-raised h-2 overflow-hidden rounded-full"
            >
              <div
                className={`h-full rounded-full ${BAR[difficulty]}`}
                style={{ width: `${total ? (solved / total) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
