import { neon } from "@neondatabase/serverless";
import { buildDefaultBuilder, normalizeBuilder } from "@/lib/server/builder";

function requiredSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return neon(process.env.DATABASE_URL);
}

let readyPromise;

async function ensureTables() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const sql = requiredSql();
      await sql`
        CREATE TABLE IF NOT EXISTS app_users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
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
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS app_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS app_rate_limits (
          bucket_key TEXT PRIMARY KEY,
          count INTEGER NOT NULL,
          reset_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
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

  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    draft: JSON.parse(row.draft_json),
    published: row.published_json ? JSON.parse(row.published_json) : null,
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

export function createNeonStore() {
  return {
    async getUserByEmail(email) {
      await ensureTables();
      const sql = requiredSql();
      const rows = await sql`SELECT * FROM app_users WHERE email = ${email.toLowerCase()} LIMIT 1`;
      return mapUser(rows[0]);
    },

    async getUserById(userId) {
      await ensureTables();
      const sql = requiredSql();
      const rows = await sql`SELECT * FROM app_users WHERE id = ${userId} LIMIT 1`;
      return mapUser(rows[0]);
    },

    async createUser({ email, passwordHash }) {
      await ensureTables();
      const sql = requiredSql();
      const user = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        passwordHash,
      };

      const existing = await sql`
        SELECT id FROM app_users WHERE email = ${user.email} LIMIT 1
      `;

      if (existing.length) {
        throw new Error("An account with that email already exists.");
      }

      await sql`
        INSERT INTO app_users (id, email, password_hash)
        VALUES (${user.id}, ${user.email}, ${user.passwordHash})
      `;

      return user;
    },

    async createBuilderForUser({ userId, email }) {
      await ensureTables();
      const sql = requiredSql();
      const baseBuilder = buildDefaultBuilder({ userId, email });
      let slug = baseBuilder.slug;
      let suffix = 2;

      while (true) {
        const conflict = await sql`
          SELECT user_id FROM builder_profiles WHERE slug = ${slug} LIMIT 1
        `;

        if (!conflict.length) {
          break;
        }

        slug = `${baseBuilder.slug}-${suffix}`;
        suffix += 1;
      }

      const draft = { ...baseBuilder, slug };
      const id = crypto.randomUUID();

      await sql`
        INSERT INTO builder_profiles (id, user_id, slug, draft_json, published_json)
        VALUES (${id}, ${userId}, ${slug}, ${JSON.stringify(draft)}, ${null})
      `;

      const rows = await sql`SELECT * FROM builder_profiles WHERE id = ${id} LIMIT 1`;
      return mapBuilder(rows[0]);
    },

    async getBuilderRecordByUserId(userId) {
      await ensureTables();
      const sql = requiredSql();
      const rows = await sql`
        SELECT * FROM builder_profiles WHERE user_id = ${userId} LIMIT 1
      `;
      return mapBuilder(rows[0]);
    },

    async saveBuilderDraft(userId, rawBuilder) {
      await ensureTables();
      const sql = requiredSql();
      const currentRows = await sql`
        SELECT * FROM builder_profiles WHERE user_id = ${userId} LIMIT 1
      `;
      const current = mapBuilder(currentRows[0]);

      if (!current) {
        throw new Error("Builder profile not found.");
      }

      const draft = normalizeBuilder(rawBuilder, current.draft);
      const slug = draft.slug || current.slug;
      const conflicts = await sql`
        SELECT user_id FROM builder_profiles WHERE slug = ${slug} AND user_id <> ${userId} LIMIT 1
      `;

      if (conflicts.length) {
        throw new Error("That public slug is already taken.");
      }

      await sql`
        UPDATE builder_profiles
        SET slug = ${slug}, draft_json = ${JSON.stringify({ ...draft, slug })}, updated_at = NOW()
        WHERE user_id = ${userId}
      `;

      const updatedRows = await sql`
        SELECT * FROM builder_profiles WHERE user_id = ${userId} LIMIT 1
      `;
      return mapBuilder(updatedRows[0]);
    },

    async publishBuilder(userId) {
      await ensureTables();
      const sql = requiredSql();
      const currentRows = await sql`
        SELECT * FROM builder_profiles WHERE user_id = ${userId} LIMIT 1
      `;
      const current = mapBuilder(currentRows[0]);

      if (!current) {
        throw new Error("Builder profile not found.");
      }

      const publishedAt = new Date().toISOString();

      await sql`
        UPDATE builder_profiles
        SET published_json = ${JSON.stringify(current.draft)}, published_at = ${publishedAt}, updated_at = NOW()
        WHERE user_id = ${userId}
      `;

      const updatedRows = await sql`
        SELECT * FROM builder_profiles WHERE user_id = ${userId} LIMIT 1
      `;
      return mapBuilder(updatedRows[0]);
    },

    async getPublishedBuilderBySlug(slug) {
      await ensureTables();
      const sql = requiredSql();
      const rows = await sql`
        SELECT published_json FROM builder_profiles
        WHERE slug = ${slug} AND published_json IS NOT NULL
        LIMIT 1
      `;

      if (!rows[0]?.published_json) {
        return null;
      }

      return JSON.parse(rows[0].published_json);
    },

    async createSession({ userId, tokenHash, expiresAt }) {
      await ensureTables();
      const sql = requiredSql();
      const id = crypto.randomUUID();

      await sql`
        INSERT INTO app_sessions (id, user_id, token_hash, expires_at)
        VALUES (${id}, ${userId}, ${tokenHash}, ${expiresAt})
      `;

      const rows = await sql`SELECT * FROM app_sessions WHERE id = ${id} LIMIT 1`;
      return mapSession(rows[0]);
    },

    async getSessionByTokenHash(tokenHash) {
      await ensureTables();
      const sql = requiredSql();
      await sql`DELETE FROM app_sessions WHERE expires_at <= NOW()`;
      const rows = await sql`
        SELECT * FROM app_sessions WHERE token_hash = ${tokenHash} LIMIT 1
      `;
      return mapSession(rows[0]);
    },

    async deleteSessionByTokenHash(tokenHash) {
      await ensureTables();
      const sql = requiredSql();
      await sql`DELETE FROM app_sessions WHERE token_hash = ${tokenHash}`;
    },

    async takeRateLimit({ key, limit, windowMs }) {
      await ensureTables();
      const sql = requiredSql();
      await sql`DELETE FROM app_rate_limits WHERE reset_at <= NOW()`;
      const rows = await sql`
        SELECT count, reset_at
        FROM app_rate_limits
        WHERE bucket_key = ${key}
        LIMIT 1
      `;
      const existing = rows[0] ?? null;
      const now = Date.now();

      if (!existing) {
        const resetAt = new Date(now + windowMs).toISOString();
        await sql`
          INSERT INTO app_rate_limits (bucket_key, count, reset_at, updated_at)
          VALUES (${key}, 1, ${resetAt}, NOW())
        `;

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
      await sql`
        UPDATE app_rate_limits
        SET count = ${nextCount}, updated_at = NOW()
        WHERE bucket_key = ${key}
      `;

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
