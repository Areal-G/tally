/**
 * API performance wrapper: records response time and errors for a route handler,
 * which the /api/performance endpoint and API status page then report.
 *
 * Usage: export const GET = withPerformanceTracking(async (request) => { ... })
 */

import { NextRequest, NextResponse } from "next/server";
import { trackEndpointPerformance } from "@/lib/monitoring/performance";

/**
 * Wrapper function to automatically track API route performance
 * 
 * This function wraps API route handlers to automatically track:
 * - Response times
 * - Success/error status
 * - Request counts
 * 
 * Metrics are stored in Redis and displayed on the API status page.
 * 
 * @param handler - The API route handler function
 * @param endpoint - Optional endpoint path (defaults to request URL pathname)
 * @returns Wrapped handler with performance tracking
 * 
 * Usage example:
 * ```typescript
 * // Before:
 * export async function GET(request: NextRequest) { ... }
 * 
 * // After (to enable tracking):
 * export const GET = withPerformanceTracking(async (request: NextRequest) => { ... });
 * ```
 */
export function withPerformanceTracking<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  endpoint?: string
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    const startTime = Date.now();
    const method = request.method;
    const path = endpoint || new URL(request.url).pathname;

    try {
      const response = await handler(request);
      const responseTime = Date.now() - startTime;

      // Track successful request
      await trackEndpointPerformance(
        path,
        method,
        responseTime,
        response.status >= 200 && response.status < 400 ? "success" : "error"
      );

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Track failed request
      await trackEndpointPerformance(path, method, responseTime, "error");

      // Re-throw error to be handled by error boundary
      throw error;
    }
  };
}

/**
 * Helper to extract endpoint path from request
 * Removes query parameters and normalizes path
 */
export function getEndpointPath(request: NextRequest): string {
  const url = new URL(request.url);
  return url.pathname;
}
