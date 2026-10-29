"use client";

import { useState, type ReactNode } from "react";

export interface PanelTab {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

/**
 * Accessible tabs whose panels can be Server Components passed in as props. Inactive panels stay
 * mounted (just hidden) so switching tabs keeps scroll position and state.
 */
export function PanelTabs({ tabs, label }: { tabs: PanelTab[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label={label} className="border-border flex gap-1 border-b px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              active === tab.id
                ? "border-accent text-foreground"
                : "text-muted hover:text-foreground border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== tab.id}
          className="min-h-0 flex-1 overflow-auto p-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
