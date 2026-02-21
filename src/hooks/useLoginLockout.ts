import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LockoutStatus {
  locked: boolean;
  attempts?: number;
  remaining_attempts?: number;
  remaining_seconds?: number;
  lockout_until?: string;
}

export function useLoginLockout() {
  const [lockout, setLockout] = useState<LockoutStatus>({ locked: false });
  const [countdown, setCountdown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setLockout({ locked: false });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const checkLockout = useCallback(async (email: string): Promise<boolean> => {
    if (!email) return false;
    try {
      const { data, error } = await supabase.rpc("check_login_lockout", {
        p_email: email,
      });
      if (error) {
        console.error("Lockout check error:", error);
        return false; // fail open — don't block login on RPC failure
      }
      const status = data as unknown as LockoutStatus;
      setLockout(status);
      if (status.locked && status.remaining_seconds) {
        setCountdown(status.remaining_seconds);
      }
      return status.locked;
    } catch {
      return false;
    }
  }, []);

  const recordAttempt = useCallback(async (email: string, success: boolean) => {
    try {
      const { data, error } = await supabase.rpc("record_login_attempt", {
        p_email: email,
        p_success: success,
      });
      if (error) {
        console.error("Record attempt error:", error);
        return;
      }
      const status = data as unknown as LockoutStatus;
      setLockout(status);
      if (status.locked && status.remaining_seconds) {
        setCountdown(status.remaining_seconds);
      }
    } catch {
      // fail silently
    }
  }, []);

  const formatCountdown = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  return {
    isLocked: lockout.locked,
    remainingAttempts: lockout.remaining_attempts,
    countdown,
    formattedCountdown: formatCountdown(countdown),
    checkLockout,
    recordAttempt,
  };
}
