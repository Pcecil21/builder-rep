#!/usr/bin/env node
/**
 * Migrate local app-state.json profile data into the Postgres database.
 * Reads your local draft (with all 30 projects), finds your user in Postgres,
 * and overwrites the draft + published data.
 *
 * Usage: node scripts/migrate-to-postgres.js
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, "..", "storage", "app-state.json");
const DATABASE_URL = "postgresql://postgres.hrntbiebmqbrmutdddcc:Wilmette21!@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

async function main() {
  // Read local state
  const raw = await readFile(STATE_PATH, "utf8");
  const state = JSON.parse(raw);
  const localBuilder = state.builders[0];

  if (!localBuilder) {
    console.error("No builder found in local app-state.json");
    process.exit(1);
  }

  const draft = localBuilder.draft;

  // Strip chatHistory from published version
  const published = { ...draft };
  delete published.chatHistory;
  // Published should not include projects that haven't been reviewed,
  // but for this migration we include all of them

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Find the user by email
    const userResult = await client.query(
      "SELECT id FROM app_users WHERE email = $1",
      ["p.cecil@yahoo.com"]
    );

    if (userResult.rows.length === 0) {
      console.error("User p.cecil@yahoo.com not found in Postgres. Sign up first at the deployed URL.");
      process.exit(1);
    }

    const userId = userResult.rows[0].id;
    console.log(`Found user: ${userId}`);

    // Update the builder profile slug to match
    const builderResult = await client.query(
      "SELECT id, slug FROM builder_profiles WHERE user_id = $1",
      [userId]
    );

    if (builderResult.rows.length === 0) {
      console.error("No builder profile found for this user.");
      process.exit(1);
    }

    const builderId = builderResult.rows[0].id;
    const slug = builderResult.rows[0].slug;
    console.log(`Found builder profile: ${builderId} (slug: ${slug})`);

    // Update the draft/published IDs to match the Postgres user
    draft.id = `builder-${userId}`;
    draft.slug = slug;
    published.id = `builder-${userId}`;
    published.slug = slug;

    // Write draft + published
    const now = new Date().toISOString();
    await client.query(
      `UPDATE builder_profiles
       SET draft_json = $1, published_json = $2, published_at = $3, updated_at = $3
       WHERE id = $4`,
      [JSON.stringify(draft), JSON.stringify(published), now, builderId]
    );

    console.log(`\nMigration complete!`);
    console.log(`- ${draft.projects.length} projects imported`);
    console.log(`- Profile fields: ${Object.keys(draft.profile).filter(k => draft.profile[k]).length}/7`);
    console.log(`- Published at: ${now}`);
    console.log(`\nVisit https://builder-rep-two.vercel.app/rep/${slug} to see your public page.`);
    console.log(`Visit https://builder-rep-two.vercel.app/studio to manage your profile.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
