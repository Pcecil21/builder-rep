import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth-config";
import { getStore } from "@/lib/server/store";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const store = getStore();
  await store.createSession({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export function sessionCookie(expiresAt) {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: getSessionCookieOptions(expiresAt),
  };
}

export function setSessionCookie(response, session) {
  response.cookies.set(SESSION_COOKIE_NAME, session.token, getSessionCookieOptions(session.expiresAt));
  return response;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const store = getStore();
  const session = await store.getSessionByTokenHash(hashToken(token));

  if (!session) {
    return null;
  }

  const user = await store.getUserById(session.userId);

  if (!user) {
    return null;
  }

  return { session, user };
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const store = getStore();
    await store.deleteSessionByTokenHash(hashToken(token));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
