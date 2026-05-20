import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "system", setTheme: () => {} });

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(theme) {
  const root = document.documentElement;
  const shouldBeDark = theme === "dark" || (theme === "system" && getSystemTheme() === "dark");
  root.classList.toggle("dark", shouldBeDark);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem("talim_theme") || "system";
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  // Re-apply when system preference changes and user chose "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyThemeClass("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    try {
      localStorage.setItem("talim_theme", newTheme);
    } catch {}
    setThemeState(newTheme);
    applyThemeClass(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
