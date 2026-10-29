"use client";

import { Moon, Sun } from "lucide-react";

import { setTheme, useTheme } from "@/lib/use-theme";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Switch to ${next} mode`}
      className="text-muted hover:text-foreground rounded-md p-1.5 transition-colors"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="sr-only">Switch to {next} mode</span>
    </button>
  );
}
