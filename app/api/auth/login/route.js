import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/server/auth";
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

const IP_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };
const EMAIL_LIMIT = { limit: 8, windowMs: 15 * 60 * 1000 };

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = schema.parse(body);
    const ip = getRequestIp(request);
    const ipLimit = await takeRateLimit({
      key: `auth:login:ip:${ip}`,
      ...IP_LIMIT,
    });

    if (!ipLimit.allowed) {
      return buildRateLimitResponse(ipLimit, "Too many login attempts from this IP.");
    }

    const emailLimit = await takeRateLimit({
      key: `auth:login:email:${email.toLowerCase()}`,
      ...EMAIL_LIMIT,
    });

    if (!emailLimit.allowed) {
      return buildRateLimitResponse(emailLimit, "Too many login attempts for this email.");
    }

    const store = getStore();
    const user = await store.getUserByEmail(email);

    if (!user) {
      return applyRateLimitHeaders(
        NextResponse.json({ error: "Invalid email or password." }, { status: 401 }),
        ipLimit,
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      return applyRateLimitHeaders(
        NextResponse.json({ error: "Invalid email or password." }, { status: 401 }),
        ipLimit,
      );
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, session);
    return applyRateLimitHeaders(response, ipLimit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to log in.";
    const status = message.includes("DATABASE_URL") ? 500 : 400;
    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
