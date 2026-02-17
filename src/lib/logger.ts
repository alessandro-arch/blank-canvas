/**
 * Minimal error logging utility with request_id for tracing.
 * Each call generates a unique request_id that can be matched
 * across frontend logs and edge function logs.
 */

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
 *   const requestId = getRequestId(req);
 */
export function getRequestIdFromHeaders(headers: Headers): string {
  return headers.get("x-request-id") || generateRequestId();
}

export { generateRequestId };
