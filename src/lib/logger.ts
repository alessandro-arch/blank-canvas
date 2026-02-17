/**
 * Minimal error logging utility with request_id for tracing.
 * Each call generates a unique request_id that can be matched
 * across frontend logs and edge function logs.
 */

import { supabase } from "@/integrations/supabase/client";

function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${ts}-${rand}`;
}

export interface LogContext {
  requestId: string;
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

function formatLog(level: string, message: string, ctx: LogContext): string {
  return `[${level}] [rid:${ctx.requestId}] ${ctx.component ? `[${ctx.component}]` : ""} ${message}`;
}

export function createLogger(component: string) {
  return {
    /** Create a new request context for tracing */
    createContext(action?: string, userId?: string): LogContext {
      return { requestId: generateRequestId(), component, action, userId };
    },

    info(message: string, ctx: LogContext, data?: Record<string, unknown>) {
      console.info(formatLog("INFO", message, ctx), data ?? "");
    },

    warn(message: string, ctx: LogContext, data?: Record<string, unknown>) {
      console.warn(formatLog("WARN", message, ctx), data ?? "");
    },

    error(message: string, ctx: LogContext, error?: unknown) {
      const errorData = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
      console.error(formatLog("ERROR", message, ctx), errorData ?? "");
    },
  };
}

/**
 * For edge functions: extract or create request_id from headers.
 * Usage in Deno edge functions:
 *   const requestId = getRequestIdFromHeaders(req.headers);
 */
export function getRequestIdFromHeaders(headers: Headers): string {
  return headers.get("x-request-id") || generateRequestId();
}

/**
 * Invoke a Supabase edge function with automatic x-request-id header.
 * Includes automatic session refresh and single retry on transient failures.
 * Returns the data or throws an error with request_id for tracing.
 */
export async function tracedInvoke<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
  component?: string,
): Promise<{ data: T; requestId: string }> {
  const requestId = generateRequestId();
  const log = createLogger(component || functionName);
  const ctx = { requestId, component: component || functionName, action: functionName };

  // Ensure session is valid before calling
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    log.warn("Session missing, attempting refresh", ctx);
    const { error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr) {
      log.error("Session refresh failed", ctx, refreshErr);
      const err = new Error("Sessão expirada. Faça login novamente.");
      (err as any).requestId = requestId;
      throw err;
    }
  }

  const invoke = async () => {
    const res = await supabase.functions.invoke(functionName, {
      body,
      headers: { "x-request-id": requestId },
    });
    return res;
  };

  log.info(`Invoking ${functionName}`, ctx);

  let res = await invoke();

  // Retry once on transient "Failed to send" errors (network/CORS/session)
  if (res.error && isTransientError(res.error)) {
    log.warn(`Transient error on ${functionName}, retrying after session refresh`, ctx);
    await supabase.auth.refreshSession();
    // Small delay to let the refreshed token propagate
    await new Promise((r) => setTimeout(r, 500));
    res = await invoke();
  }

  if (res.error) {
    log.error(`${functionName} failed`, ctx, res.error);
    const err = new Error(res.error.message || `Erro ao chamar ${functionName}`);
    (err as any).requestId = requestId;
    (err as any).isTransient = isTransientError(res.error);
    throw err;
  }

  log.info(`${functionName} succeeded`, ctx);
  return { data: res.data as T, requestId };
}

/** Check if an error is transient (network/CORS/session) and worth retrying */
function isTransientError(error: any): boolean {
  const msg = (error?.message || error?.msg || "").toLowerCase();
  return (
    msg.includes("failed to send") ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("cors") ||
    msg.includes("timeout")
  );
}

/**
 * Extract a user-friendly error message from any error.
 * Appends request_id if available for support reference.
 */
export function friendlyError(err: unknown, fallback = "Ocorreu um erro inesperado."): string {
  const msg = err instanceof Error ? err.message : fallback;
  const rid = (err as any)?.requestId;
  const isTransient = (err as any)?.isTransient;

  let displayMsg = msg;
  if (isTransient || msg.toLowerCase().includes("failed to send") || msg.toLowerCase().includes("failed to fetch")) {
    displayMsg = "Conexão instável ou sessão expirada. Recarregue a página e tente novamente.";
  }

  return rid ? `${displayMsg} (ref: ${rid})` : displayMsg;
}

export { generateRequestId };
