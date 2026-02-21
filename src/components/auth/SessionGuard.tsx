import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/App";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // warn 2min before expiry
const ACTIVITY_EVENTS = ["mousemove", "keydown", "scroll", "touchstart", "click"] as const;
const THROTTLE_MS = 15_000; // only reset timer every 15s to reduce overhead

// Public routes that don't need session guarding
const PUBLIC_ROUTES = ["/", "/acesso", "/bolsista/login", "/admin/login", "/recuperar-senha", "/criar-conta", "/criar-conta-membro", "/acesso-negado", "/session-expired", "/convite", "/invite"];

export function SessionGuard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const [showWarning, setShowWarning] = useState(false);
  const [showNetworkError, setShowNetworkError] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPublicRoute = PUBLIC_ROUTES.some((r) => location.pathname === r || location.pathname.startsWith("/invite/"));

  // ── Expire session ──
  const expireSession = useCallback(() => {
    setShowWarning(false);
    clearCountdown();
    const returnUrl = location.pathname + location.search;
    navigate(`/session-expired?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
  }, [navigate, location.pathname, location.search]);

  // ── Countdown helper ──
  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(120);
    clearCountdown();
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          expireSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdown, expireSession]);

  // ── Reset idle timer ──
  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    clearCountdown();
    setShowWarning(false);

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      startCountdown();
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Set expiry timer (fallback)
    idleTimerRef.current = setTimeout(() => {
      expireSession();
    }, IDLE_TIMEOUT_MS);
  }, [expireSession, clearCountdown, startCountdown]);

  // ── Throttled activity handler ──
  const handleActivity = useCallback(() => {
    if (Date.now() - lastActivityRef.current < THROTTLE_MS) return;
    if (showWarning) return; // don't reset if warning is visible
    resetTimers();
  }, [resetTimers, showWarning]);

  // ── Continue session from warning modal ──
  const handleContinueSession = useCallback(async () => {
    setShowWarning(false);
    clearCountdown();
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
      resetTimers();
      toast.success("Sessão renovada com sucesso");
    } catch {
      expireSession();
    }
  }, [resetTimers, expireSession, clearCountdown]);

  // ── Intercept auth state for token refresh failures ──
  useEffect(() => {
    if (!user || isPublicRoute) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") {
        // Token refreshed OK – no action needed
      }
      if (event === "SIGNED_OUT") {
        // Clear all cached data and force redirect to login
        queryClient.clear();
        navigate("/acesso", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [user, isPublicRoute]);

  // ── Global fetch interceptor for 401 ──
  useEffect(() => {
    if (!user || isPublicRoute) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // Only intercept 401 from our Supabase backend
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";
        const isSupabaseRequest = url.includes("supabase.co") || url.includes("supabase.in");

        if (response.status === 401 && isSupabaseRequest) {
          // Try refresh first
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            expireSession();
          }
        }

        // Network/server errors – show connection warning, NOT session expired
        if (response.status >= 500 && isSupabaseRequest) {
          setShowNetworkError(true);
          setTimeout(() => setShowNetworkError(false), 5000);
        }

        return response;
      } catch (err) {
        // Network error (offline, DNS failure, etc.)
        if (err instanceof TypeError && err.message.includes("fetch")) {
          setShowNetworkError(true);
          setTimeout(() => setShowNetworkError(false), 5000);
        }
        throw err;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [user, isPublicRoute, expireSession]);

  // ── Activity listeners + idle timer ──
  useEffect(() => {
    if (!user || isPublicRoute) return;

    resetTimers();

    ACTIVITY_EVENTS.forEach((evt) => document.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => document.removeEventListener(evt, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      clearCountdown();
    };
  }, [user, isPublicRoute, handleActivity, resetTimers, clearCountdown]);

  // ── Warning modal (pre-expiration) ──
  if (showWarning && user && !isPublicRoute) {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-2">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <DialogTitle className="text-center">Sua sessão vai expirar</DialogTitle>
            <DialogDescription className="text-center">
              Por inatividade, sua sessão será encerrada em{" "}
              <span className="font-semibold text-foreground">{countdown} segundo{countdown !== 1 ? "s" : ""}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleContinueSession} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Continuar sessão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Network error toast-like banner ──
  if (showNetworkError) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm animate-in slide-in-from-bottom-4">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>Problema de conexão. Verifique sua internet e tente novamente.</span>
      </div>
    );
  }

  return null;
}
