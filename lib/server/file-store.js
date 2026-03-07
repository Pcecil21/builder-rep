import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDefaultBuilder, normalizeBuilder } from "@/lib/server/builder";
import { slugify } from "@/lib/slug";

const STORE_PATH = path.join(process.cwd(), "storage", "app-state.json");

function emptyState() {
  return {
    users: [],
    sessions: [],
    builders: [],
    rateLimits: [],
  };
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(emptyState(), null, 2));
  }
}

async function readState() {
  await ensureStoreFile();
  const raw = await readFile(STORE_PATH, "utf8");
  const parsed = raw ? JSON.parse(raw) : emptyState();

  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    builders: Array.isArray(parsed.builders) ? parsed.builders : [],
    rateLimits: Array.isArray(parsed.rateLimits) ? parsed.rateLimits : [],
  };
}

async function writeState(state) {
  await ensureStoreFile();
  await writeFile(STORE_PATH, JSON.stringify(state, null, 2));
}

function uniqueSlug(desiredSlug, builders, excludeUserId = null) {
  const seen = new Set(
    builders
      .filter((builder) => builder.userId !== excludeUserId)
      .map((builder) => builder.slug),
  );

  let candidate = slugify(desiredSlug);
  let suffix = 2;

  while (seen.has(candidate)) {
    candidate = `${slugify(desiredSlug)}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function cleanupExpiredRateLimits(state, now) {
  state.rateLimits = state.rateLimits.filter((bucket) => new Date(bucket.resetAt).getTime() > now);
}

export function createFileStore() {
  return {
    async getUserByEmail(email) {
      const state = await readState();
      return state.users.find((user) => user.email === email.toLowerCase()) ?? null;
    },

    async getUserById(userId) {
      const state = await readState();
      return state.users.find((user) => user.id === userId) ?? null;
    },

    async createUser({ email, passwordHash }) {
      const state = await readState();
      const normalizedEmail = email.toLowerCase();

      if (state.users.some((user) => user.email === normalizedEmail)) {
        throw new Error("An account with that email already exists.");
      }

      const user = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      state.users.push(user);
      await writeState(state);
      return user;
    },

    async createBuilderForUser({ userId, email }) {
      const state = await readState();
      const baseBuilder = buildDefaultBuilder({ userId, email });
      const slug = uniqueSlug(baseBuilder.slug, state.builders);
      const draft = { ...baseBuilder, slug };
      const record = {
        id: crypto.randomUUID(),
        userId,
        slug,
        draft,
        published: null,
        publishedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.builders.push(record);
      await writeState(state);
      return record;
    },

    async getBuilderRecordByUserId(userId) {
      const state = await readState();
      return state.builders.find((builder) => builder.userId === userId) ?? null;
    },

    async saveBuilderDraft(userId, rawBuilder) {
      const state = await readState();
      const record = state.builders.find((builder) => builder.userId === userId);

      if (!record) {
        throw new Error("Builder profile not found.");
      }

      const draft = normalizeBuilder(rawBuilder, record.draft);
      const desiredSlug = draft.slug || record.slug;
      const conflict = state.builders.find(
        (builder) => builder.userId !== userId && builder.slug === desiredSlug,
      );

      if (conflict) {
        throw new Error("That public slug is already taken.");
      }

      record.slug = desiredSlug;
      record.draft = { ...draft, slug: desiredSlug };
      record.updatedAt = new Date().toISOString();

      await writeState(state);
      return record;
    },

    async publishBuilder(userId) {
      const state = await readState();
      const record = state.builders.find((builder) => builder.userId === userId);

      if (!record) {
        throw new Error("Builder profile not found.");
      }

      record.published = structuredClone(record.draft);
      record.publishedAt = new Date().toISOString();
      record.updatedAt = record.publishedAt;

      await writeState(state);
      return record;
    },

    async getPublishedBuilderBySlug(slug) {
      const state = await readState();
      const record = state.builders.find((builder) => builder.slug === slug && builder.published);
      return record?.published ?? null;
    },

    async createSession({ userId, tokenHash, expiresAt }) {
      const state = await readState();
      const session = {
        id: crypto.randomUUID(),
        userId,
        tokenHash,
        expiresAt,
        createdAt: new Date().toISOString(),
      };

      state.sessions = state.sessions.filter(
        (existing) => !(existing.userId === userId && existing.tokenHash === tokenHash),
      );
      state.sessions.push(session);
      await writeState(state);
      return session;
    },

    async getSessionByTokenHash(tokenHash) {
      const state = await readState();
      const session = state.sessions.find((item) => item.tokenHash === tokenHash) ?? null;

      if (!session) {
        return null;
      }

      if (new Date(session.expiresAt) <= new Date()) {
        state.sessions = state.sessions.filter((item) => item.tokenHash !== tokenHash);
        await writeState(state);
        return null;
      }

      return session;
    },

    async deleteSessionByTokenHash(tokenHash) {
      const state = await readState();
      state.sessions = state.sessions.filter((session) => session.tokenHash !== tokenHash);
      await writeState(state);
    },

    async takeRateLimit({ key, limit, windowMs }) {
      const state = await readState();
      const now = Date.now();
      cleanupExpiredRateLimits(state, now);

      let bucket = state.rateLimits.find((item) => item.key === key) ?? null;

      if (!bucket) {
        bucket = {
          key,
          count: 0,
          resetAt: new Date(now + windowMs).toISOString(),
        };
        state.rateLimits.push(bucket);
      }

      if (bucket.count >= limit) {
        await writeState(state);
        const retryAfterMs = Math.max(0, new Date(bucket.resetAt).getTime() - now);

        return {
          allowed: false,
          limit,
          remaining: 0,
          resetAt: bucket.resetAt,
          retryAfterMs,
        };
      }

      bucket.count += 1;
      await writeState(state);

      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - bucket.count),
        resetAt: bucket.resetAt,
        retryAfterMs: 0,
      };
    },
  };
}
