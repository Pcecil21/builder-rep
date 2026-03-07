import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword, setSessionCookie } from "@/lib/server/auth";
import { getRequestIp } from "@/lib/server/request";
import {
  applyRateLimitHeaders,
  buildRateLimitResponse,
  takeRateLimit,
} from "@/lib/server/rate-limit";
import { getStore } from "@/lib/server/store";

const schema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

const IP_LIMIT = { limit: 6, windowMs: 60 * 60 * 1000 };
const EMAIL_LIMIT = { limit: 4, windowMs: 60 * 60 * 1000 };

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = schema.parse(body);
    const ip = getRequestIp(request);
    const ipLimit = await takeRateLimit({
      key: `auth:signup:ip:${ip}`,
      ...IP_LIMIT,
    });

    if (!ipLimit.allowed) {
      return buildRateLimitResponse(ipLimit, "Too many signup attempts from this IP.");
    }

    const emailLimit = await takeRateLimit({
      key: `auth:signup:email:${email.toLowerCase()}`,
      ...EMAIL_LIMIT,
    });

    if (!emailLimit.allowed) {
      return buildRateLimitResponse(emailLimit, "Too many signup attempts for this email.");
    }

    const store = getStore();
    const user = await store.createUser({
      email,
      passwordHash: await hashPassword(password),
    });

    await store.createBuilderForUser({
      userId: user.id,
      email: user.email,
    });

    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, session);
    return applyRateLimitHeaders(response, ipLimit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign up.";
    const status = message.includes("already exists")
      ? 409
      : message.includes("DATABASE_URL")
        ? 500
        : 400;
    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
