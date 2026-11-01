"use client";
import { useState } from "react";
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  return (
    <button
      className="theme-toggle"
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
