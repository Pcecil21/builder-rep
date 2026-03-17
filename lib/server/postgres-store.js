import { Pool } from "pg";
import { buildDefaultBuilder, normalizeBuilder } from "@/lib/server/builder";

let pool;
let readyPromise;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  }

  return pool;
}

async function query(text, params = []) {
  const client = await getPool().connect();

  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function ensureTables() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS app_users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS builder_profiles (
          id TEXT PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          draft_json TEXT NOT NULL,
          published_json TEXT,
          published_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS app_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS app_rate_limits (
          bucket_key TEXT PRIMARY KEY,
          count INTEGER NOT NULL,
          reset_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    })();
  }

  return readyPromise;
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

function mapBuilder(row) {
  if (!row) {
    return null;
  }

  const draft = normalizeBuilder(JSON.parse(row.draft_json));
  const published = row.published_json ? normalizeBuilder(JSON.parse(row.published_json), draft) : null;

  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    draft: { ...draft, slug: row.slug },
    published,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export function createPostgresStore() {
  return {
    async getUserByEmail(email) {
      await ensureTables();
      const result = await query("SELECT * FROM app_users WHERE email = $1 LIMIT 1", [
        email.toLowerCase(),
      ]);
      return mapUser(result.rows[0]);
    },

    async getUserById(userId) {
      await ensureTables();
      const result = await query("SELECT * FROM app_users WHERE id = $1 LIMIT 1", [userId]);
      return mapUser(result.rows[0]);
    },

    async createUser({ email, passwordHash }) {
      await ensureTables();
      const user = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        passwordHash,
      };

      const existing = await query("SELECT id FROM app_users WHERE email = $1 LIMIT 1", [user.email]);

      if (existing.rows.length) {
        throw new Error("An account with that email already exists.");
      }

      await query(
        "INSERT INTO app_users (id, email, password_hash) VALUES ($1, $2, $3)",
        [user.id, user.email, user.passwordHash],
      );

      return user;
    },

    async createBuilderForUser({ userId, email }) {
      await ensureTables();
      const baseBuilder = buildDefaultBuilder({ userId, email });
      let slug = baseBuilder.slug;
      let suffix = 2;

      while (true) {
        const conflict = await query(
          "SELECT user_id FROM builder_profiles WHERE slug = $1 LIMIT 1",
          [slug],
        );

        if (!conflict.rows.length) {
          break;
        }

        slug = `${baseBuilder.slug}-${suffix}`;
        suffix += 1;
      }

      const draft = { ...baseBuilder, slug };
      const id = crypto.randomUUID();

      await query(
        "INSERT INTO builder_profiles (id, user_id, slug, draft_json, published_json) VALUES ($1, $2, $3, $4, $5)",
        [id, userId, slug, JSON.stringify(draft), null],
      );

      const result = await query("SELECT * FROM builder_profiles WHERE id = $1 LIMIT 1", [id]);
      return mapBuilder(result.rows[0]);
    },

    async getBuilderRecordByUserId(userId) {
      await ensureTables();
      const result = await query(
        "SELECT * FROM builder_profiles WHERE user_id = $1 LIMIT 1",
        [userId],
      );
      return mapBuilder(result.rows[0]);
    },

    async saveBuilderDraft(userId, rawBuilder) {
      await ensureTables();
      const currentResult = await query(
        "SELECT * FROM builder_profiles WHERE user_id = $1 LIMIT 1",
        [userId],
      );
      const current = mapBuilder(currentResult.rows[0]);

      if (!current) {
        throw new Error("Builder profile not found.");
      }

      const draft = normalizeBuilder(rawBuilder, current.draft);
      const slug = draft.slug || current.slug;
      const conflicts = await query(
        "SELECT user_id FROM builder_profiles WHERE slug = $1 AND user_id <> $2 LIMIT 1",
        [slug, userId],
      );

      if (conflicts.rows.length) {
        throw new Error("That public slug is already taken.");
      }

      await query(
        "UPDATE builder_profiles SET slug = $1, draft_json = $2, updated_at = NOW() WHERE user_id = $3",
        [slug, JSON.stringify({ ...draft, slug }), userId],
      );

      const updatedResult = await query(
        "SELECT * FROM builder_profiles WHERE user_id = $1 LIMIT 1",
        [userId],
      );
      return mapBuilder(updatedResult.rows[0]);
    },

    async resetBuilderForUser({ userId, email }) {
      await ensureTables();
      const currentResult = await query(
        "SELECT * FROM builder_profiles WHERE user_id = $1 LIMIT 1",
        [userId],
      );
      const current = mapBuilder(currentResult.rows[0]);

      if (!current) {
        return this.createBuilderForUser({ userId, email });
      }

      const resetDraft = {
        ...buildDefaultBuilder({ userId, email }),
        id: current.draft?.id ?? `builder-${userId}`,
        slug: current.slug,
      };

      await query(
        "UPDATE builder_profiles SET draft_json = $1, published_json = NULL, published_at = NULL, updated_at = NOW() WHERE user_id = $2",
        [JSON.stringify(resetDraft), userId],
      );

      const updatedResult = await query(
        "SELECT * FROM builder_profiles WHERE user_id = $1 LIMIT 1",
        [userId],
      );
      return mapBuilder(updatedResult.rows[0]);
    },

    async publishBuilder(userId) {
      await ensureTables();
      const currentResult = await query(
        "SELECT * FROM builder_profiles WHERE user_id = $1 LIMIT 1",
        [userId],
      );
      const current = mapBuilder(currentResult.rows[0]);

      if (!current) {
        throw new Error("Builder profile not found.");
      }

      const publishedAt = new Date().toISOString();

      await query(
        "UPDATE builder_profiles SET published_json = $1, published_at = $2, updated_at = NOW() WHERE user_id = $3",
        [JSON.stringify(current.draft), publishedAt, userId],
      );

      const updatedResult = await query(
        "SELECT * FROM builder_profiles WHERE user_id = $1 LIMIT 1",
        [userId],
      );
      return mapBuilder(updatedResult.rows[0]);
    },

    async getPublishedBuilderBySlug(slug) {
      await ensureTables();
      const result = await query(
        "SELECT published_json FROM builder_profiles WHERE slug = $1 AND published_json IS NOT NULL LIMIT 1",
        [slug],
      );

      if (!result.rows[0]?.published_json) {
        return null;
      }

      return normalizeBuilder(JSON.parse(result.rows[0].published_json));
    },

    async createSession({ userId, tokenHash, expiresAt }) {
      await ensureTables();
      const id = crypto.randomUUID();

      await query(
        "INSERT INTO app_sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
        [id, userId, tokenHash, expiresAt],
      );

      const result = await query("SELECT * FROM app_sessions WHERE id = $1 LIMIT 1", [id]);
      return mapSession(result.rows[0]);
    },

    async getSessionByTokenHash(tokenHash) {
      await ensureTables();
      await query("DELETE FROM app_sessions WHERE expires_at <= NOW()");
      const result = await query(
        "SELECT * FROM app_sessions WHERE token_hash = $1 LIMIT 1",
        [tokenHash],
      );
      return mapSession(result.rows[0]);
    },

    async deleteSessionByTokenHash(tokenHash) {
      await ensureTables();
      await query("DELETE FROM app_sessions WHERE token_hash = $1", [tokenHash]);
    },

    async takeRateLimit({ key, limit, windowMs }) {
      await ensureTables();
      await query("DELETE FROM app_rate_limits WHERE reset_at <= NOW()");
      const result = await query(
        "SELECT count, reset_at FROM app_rate_limits WHERE bucket_key = $1 LIMIT 1",
        [key],
      );
      const existing = result.rows[0] ?? null;
      const now = Date.now();

      if (!existing) {
        const resetAt = new Date(now + windowMs).toISOString();
        await query(
          "INSERT INTO app_rate_limits (bucket_key, count, reset_at, updated_at) VALUES ($1, $2, $3, NOW())",
          [key, 1, resetAt],
        );

        return {
          allowed: true,
          limit,
          remaining: Math.max(0, limit - 1),
          resetAt,
          retryAfterMs: 0,
        };
      }

      const resetAt = new Date(existing.reset_at).toISOString();

      if (existing.count >= limit) {
        return {
          allowed: false,
          limit,
          remaining: 0,
          resetAt,
          retryAfterMs: Math.max(0, new Date(resetAt).getTime() - now),
        };
      }

      const nextCount = existing.count + 1;
      await query(
        "UPDATE app_rate_limits SET count = $1, updated_at = NOW() WHERE bucket_key = $2",
        [nextCount, key],
      );

      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - nextCount),
        resetAt,
        retryAfterMs: 0,
      };
    },
  };
}
