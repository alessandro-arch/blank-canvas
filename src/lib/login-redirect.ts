/**
 * Determines the correct login route based on a given path prefix.
 * Rules:
 *  /bolsista/* -> /bolsista/login
 *  /manager/*  -> /manager/login
 *  /admin/*    -> /admin/login
 *  fallback    -> /bolsista/login
 */
export function getLoginRouteForPath(pathname: string): string {
  if (pathname.startsWith("/bolsista")) return "/bolsista/login";
  if (pathname.startsWith("/manager")) return "/manager/login";
  if (pathname.startsWith("/admin")) return "/admin/login";
  return "/bolsista/login";
}
