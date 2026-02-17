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
      // Only apply dark if explicitly chosen; "system" and any other value default to light
      const isDark = mode === "dark";
      setResolvedTheme(isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
    };

    applyTheme(settings.theme_mode);
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
