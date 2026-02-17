import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserSettings {
  theme_mode: "light" | "dark" | "system";
  sidebar_behavior: "expanded" | "collapsed" | "hover";
  density: "comfortable" | "compact";
}

const DEFAULT_SETTINGS: UserSettings = {
  theme_mode: "light",
  sidebar_behavior: "expanded",
  density: "comfortable",
};

export function useUserSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_settings" as any)
        .select("theme_mode, sidebar_behavior, density")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          theme_mode: (data as any).theme_mode || DEFAULT_SETTINGS.theme_mode,
          sidebar_behavior: (data as any).sidebar_behavior || DEFAULT_SETTINGS.sidebar_behavior,
          density: (data as any).density || DEFAULT_SETTINGS.density,
        });
      }
    } catch (err) {
      console.error("Error fetching user settings:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (partial: Partial<UserSettings>) => {
      if (!user) return;

      const newSettings = { ...settings, ...partial };
      setSettings(newSettings);

      try {
        const { error } = await supabase
          .from("user_settings" as any)
          .upsert(
            {
              user_id: user.id,
              ...newSettings,
            } as any,
            { onConflict: "user_id" }
          );

        if (error) throw error;

        toast({
          title: "Preferências salvas",
          description: "Suas configurações foram atualizadas.",
        });
      } catch (err) {
        console.error("Error saving user settings:", err);
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar suas preferências.",
          variant: "destructive",
        });
      }
    },
    [user, settings, toast]
  );

  return { settings, loading, updateSettings };
}
