import { createHash, randomUUID } from "node:crypto";
import { getStore } from "@/lib/server/store";

/**
 * Generate a visitor ID by hashing IP + User-Agent.
 */
function buildVisitorId(ip, ua) {
  return createHash("sha256")
    .update((ip || "unknown") + (ua || "unknown"))
    .digest("hex");
}

/**
 * Extract IP and User-Agent from a Request or from next/headers.
 * Accepts either a Request object (route handlers) or a Headers object (server components).
 */
function extractHeaders(requestOrHeaders) {
  const headers =
    typeof requestOrHeaders.get === "function"
      ? requestOrHeaders
      : requestOrHeaders.headers;

  const forwardedFor = headers.get("x-forwarded-for");
  const ip = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : headers.get("x-real-ip") ?? "unknown";
  const ua = headers.get("user-agent") ?? "unknown";

  return { ip, ua };
}

/**
 * Track an analytics event. Fire-and-forget; errors are swallowed so
 * analytics never break page rendering.
 *
 * @param {string} slug - Builder slug
 * @param {string} eventType - 'page_view' | 'chat_message' | 'portfolio_view'
 * @param {Request|Headers} requestOrHeaders - The incoming request or headers() result
 * @param {Record<string, any>} [metadata] - Optional metadata object
 */
export async function trackEvent(slug, eventType, requestOrHeaders, metadata = null) {
  try {
    const store = getStore();

    // Only postgres store supports analytics
    if (typeof store.insertAnalyticsEvent !== "function") {
      return;
    }

    const { ip, ua } = extractHeaders(requestOrHeaders);
    const visitorId = buildVisitorId(ip, ua);

    await store.insertAnalyticsEvent({
      id: randomUUID(),
      slug,
      eventType,
      visitorId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch {
    // Silently ignore analytics failures
  }
}

/**
 * Get event counts grouped by type and day for a slug.
 *
 * @param {string} slug
 * @param {number} [days=30]
 * @returns {Promise<Array<{ date: string, event_type: string, count: number }>>}
 */
export async function getAnalytics(slug, days = 30) {
  const store = getStore();

  if (typeof store.getAnalyticsEvents !== "function") {
    return [];
  }

  return store.getAnalyticsEvents(slug, days);
}

/**
 * Get unique visitor count for a slug.
 *
 * @param {string} slug
 * @param {number} [days=30]
 * @returns {Promise<number>}
 */
export async function getVisitorCount(slug, days = 30) {
  const store = getStore();

  if (typeof store.getAnalyticsVisitorCount !== "function") {
    return 0;
  }

  return store.getAnalyticsVisitorCount(slug, days);
}
