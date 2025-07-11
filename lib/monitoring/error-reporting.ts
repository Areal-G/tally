/**
 * Error-reporting hooks for app code (logger, API routes).
 * Errors go to the console, which is the server log on most hosts.
 * Swap these for an error tracker's client if you add one.
 */

export function captureException(
  error: Error,
  context?: Record<string, unknown>,
): void {
  console.error(error, ...(context ? [context] : []));
}

export function captureMessage(
  message: string,
  level: "error" | "warning" | "info" = "error",
  context?: Record<string, unknown>,
): void {
  const log = level === "error" ? console.error : level === "warning" ? console.warn : console.info;
  log(message, ...(context ? [context] : []));
}
