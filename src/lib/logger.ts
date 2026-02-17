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
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    log.warn("Session missing, attempting refresh", ctx);
    const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr || !refreshData.session) {
      log.error("Session refresh failed", ctx, refreshErr);
      const err = new Error("Sessão expirada. Faça login novamente.");
      (err as any).requestId = requestId;
      throw err;
    }
    session = refreshData.session;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  const doFetch = async (accessToken: string) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "apikey": supabaseKey,
        "x-request-id": requestId,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { parsed = null; }
      const msg = parsed?.error || `Erro ${res.status}: ${text.substring(0, 200)}`;
      const err = new Error(msg);
      (err as any).status = res.status;
      throw err;
    }
    return res.json();
  };

  log.info(`Invoking ${functionName}`, ctx);

  try {
    const data = await doFetch(session.access_token);
    log.info(`${functionName} succeeded`, ctx);
    return { data: data as T, requestId };
  } catch (firstErr: any) {
    if (isTransientError(firstErr) || firstErr.status === 401) {
      log.warn(`Transient/auth error on ${functionName}, retrying after session refresh`, ctx);
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData.session) {
        await new Promise((r) => setTimeout(r, 500));
        try {
          const data = await doFetch(refreshData.session.access_token);
          log.info(`${functionName} succeeded on retry`, ctx);
          return { data: data as T, requestId };
        } catch (retryErr: any) {
          log.error(`${functionName} failed on retry`, ctx, retryErr);
          retryErr.requestId = requestId;
          retryErr.isTransient = isTransientError(retryErr);
          throw retryErr;
        }
      }
    }
    log.error(`${functionName} failed`, ctx, firstErr);
    firstErr.requestId = requestId;
    firstErr.isTransient = isTransientError(firstErr);
    throw firstErr;
  }
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
 * Invoke a Supabase edge function that uses background processing.
 * Returns immediately with a jobId, then polls for completion.
 * The edge function must support { job_id } to return status/signedUrl.
 */
export async function tracedInvokeWithPolling<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
  component?: string,
  options?: { pollIntervalMs?: number; maxPollMs?: number; onProgress?: (status: string) => void },
): Promise<{ data: T; requestId: string }> {
  const { pollIntervalMs = 3000, maxPollMs = 120000, onProgress } = options || {};

  // Initial call - should return { jobId, status: "processing" }
  const { data: initialData, requestId } = await tracedInvoke<{ jobId: string; status: string }>(
    functionName, body, component,
  );

  const jobId = initialData.jobId;
  if (!jobId) {
    // Function returned synchronously (no background processing)
    return { data: initialData as unknown as T, requestId };
  }

  onProgress?.("processing");

  // Poll for completion
  const log = createLogger(component || functionName);
  const ctx = { requestId, component: component || functionName, action: `${functionName}:poll` };
  const startPoll = Date.now();

  while (Date.now() - startPoll < maxPollMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const { data: statusData } = await tracedInvoke<{ status: string; signedUrl?: string; error?: string }>(
      functionName, { job_id: jobId }, component,
    );

    if (statusData.status === "success") {
      log.info(`${functionName} job ${jobId} completed`, ctx);
      onProgress?.("success");
      return { data: statusData as unknown as T, requestId };
    }

    if (statusData.status === "error") {
      const err = new Error(statusData.error || "Erro na geração do relatório");
      (err as any).requestId = requestId;
      throw err;
    }

    onProgress?.("processing");
  }

  const err = new Error("Tempo limite excedido. O relatório está demorando mais que o esperado.");
  (err as any).requestId = requestId;
  throw err;
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
