import { NextResponse } from "next/server";
import { z } from "zod";
import { trackEvent } from "@/lib/server/analytics";
import { handleChatPayload } from "@/lib/server/chat";
import { getRequestIp } from "@/lib/server/request";
import {
  applyRateLimitHeaders,
  buildRateLimitResponse,
  takeRateLimit,
} from "@/lib/server/rate-limit";
import { getStore } from "@/lib/server/store";

const messageSchema = z.object({
  role: z.string().max(32).optional(),
  text: z.string().max(1200).optional(),
});

const schema = z.object({
  slug: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/),
  userText: z.string().trim().min(1).max(1200),
  history: z.array(messageSchema).max(20).optional(),
});

const GLOBAL_LIMIT = { limit: 60, windowMs: 15 * 60 * 1000 };
const REP_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { slug, userText, history = [] } = schema.parse(body);
    const ip = getRequestIp(request);
    const globalLimit = await takeRateLimit({
      key: `public-chat:ip:${ip}`,
      ...GLOBAL_LIMIT,
    });

    if (!globalLimit.allowed) {
      return buildRateLimitResponse(globalLimit, "Too many public chat requests from this IP.");
    }

    const repLimit = await takeRateLimit({
      key: `public-chat:slug:${slug}:ip:${ip}`,
      ...REP_LIMIT,
    });

    if (!repLimit.allowed) {
      return buildRateLimitResponse(repLimit, "Too many requests for this builder rep right now.");
    }

    const store = getStore();
    const builder = await store.getPublishedBuilderBySlug(slug);

    if (!builder) {
      return NextResponse.json({ error: "Builder rep not found." }, { status: 404 });
    }

    const payload = await handleChatPayload({
      surface: "viewer",
      builder,
      history: history.map((message) => ({
        role: typeof message.role === "string" ? message.role : "",
        text: typeof message.text === "string" ? message.text : "",
      })),
      userText,
    });

    trackEvent(slug, "chat_message", request, { question: userText });

    return applyRateLimitHeaders(NextResponse.json(payload), repLimit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed.";
    const status = message.includes("DATABASE_URL") ? 500 : 400;
    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
