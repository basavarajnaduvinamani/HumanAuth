"use client";
import { useState } from "react";
import { useHydrated } from "../lib/use-hydrated";
export function ThemeToggle() {
  const hydrated = useHydrated();
  const [dark, setDark] = useState(false);
  return (
    <button
      className="theme-toggle"
      disabled={!hydrated}
      aria-label="Theme: toggle dark theme"
      aria-pressed={dark}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "light";
      }}
    >
      Theme <span aria-hidden="true">{dark ? "◐" : "◑"}</span>
    </button>
  );
}
