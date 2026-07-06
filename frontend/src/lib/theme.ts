"use client";

import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "auto";

const KEY = "taxinarx_theme";

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const isDark =
    t === "dark" ||
    (t === "auto" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function initTheme() {
  if (typeof window === "undefined") return;
  const t = (localStorage.getItem(KEY) as Theme) || "auto";
  applyTheme(t);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("auto");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Theme) || "auto";
    setThemeState(saved);
    applyTheme(saved);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(KEY, t);
    setThemeState(t);
    applyTheme(t);
  }, []);

  const isDark =
    theme === "dark" ||
    (theme === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return { theme, setTheme, isDark };
}
