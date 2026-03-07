import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";

export async function takeRateLimit({ key, limit, windowMs }) {
  const store = getStore();
  return store.takeRateLimit({ key, limit, windowMs });
}

export function applyRateLimitHeaders(response, result) {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil(new Date(result.resetAt).getTime() / 1000)),
  );

  if (!result.allowed) {
    response.headers.set("Retry-After", String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))));
  }

  return response;
}

export function buildRateLimitResponse(
  result,
  message = "Too many requests. Please wait and try again.",
) {
  const response = NextResponse.json(
    {
      error: message,
      retryAfterSeconds: Math.max(1, Math.ceil(result.retryAfterMs / 1000)),
    },
    { status: 429 },
  );

  return applyRateLimitHeaders(response, result);
}
