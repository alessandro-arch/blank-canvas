import React, { createContext, useContext, useEffect, useState } from "react";
import { useUserSettings, UserSettings } from "@/hooks/useUserSettings";

interface ThemeContextValue {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  loading: boolean;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, loading, updateSettings } = useUserSettings();
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Cleanup theme classes when unmounting (e.g., logout)
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("dark", "density-compact");
    };
  }, []);

  useEffect(() => {
    const applyTheme = (mode: string) => {
      if (mode === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setResolvedTheme(prefersDark ? "dark" : "light");
        document.documentElement.classList.toggle("dark", prefersDark);
      } else {
        setResolvedTheme(mode as "light" | "dark");
        document.documentElement.classList.toggle("dark", mode === "dark");
      }
    };

    applyTheme(settings.theme_mode);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (settings.theme_mode === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [settings.theme_mode]);

  // Apply density
  useEffect(() => {
    document.documentElement.classList.toggle("density-compact", settings.density === "compact");
  }, [settings.density]);

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, loading, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
