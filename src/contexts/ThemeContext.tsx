import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useUserSettings, UserSettings } from "@/hooks/useUserSettings";

// ── Helper: apply theme class atomically ──
function applyThemeClass(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.remove("theme-light");
    root.classList.add("theme-dark", "dark");
  } else {
    root.classList.remove("theme-dark", "dark");
    root.classList.add("theme-light");
  }
}

// ── Context ──
interface ThemeContextValue {
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => Promise<void>;
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, loading, updateSettings } = useUserSettings();
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  // Cleanup on unmount (logout)
  useEffect(() => {
    return () => {
      applyThemeClass("light");
      document.documentElement.classList.remove("theme-ready", "density-compact");
    };
  }, []);

  // Apply theme when settings load or change
  useEffect(() => {
    const resolved: "light" | "dark" = settings.theme_mode === "dark" ? "dark" : "light";
    setThemeState(resolved);
    applyThemeClass(resolved);

    // Enable smooth transitions AFTER first paint
    if (!loading) {
      requestAnimationFrame(() => {
        document.documentElement.classList.add("theme-ready");
      });
    }
  }, [settings.theme_mode, loading]);

  // Apply density
  useEffect(() => {
    document.documentElement.classList.toggle("density-compact", settings.density === "compact");
  }, [settings.density]);

  // Exposed setTheme persists to DB
  const setTheme = useCallback(
    async (t: "light" | "dark") => {
      setThemeState(t);
      applyThemeClass(t);
      await updateSettings({ theme_mode: t });
    },
    [updateSettings],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, settings, updateSettings, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
