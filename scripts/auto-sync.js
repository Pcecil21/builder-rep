#!/usr/bin/env node
/**
 * Auto-sync projects from C:\Users\pceci\Claude\Projects\ into Postgres draft_json.
 *
 * For each project directory:
 *   - Reads CLAUDE.md or README.md and package.json
 *   - Gets GitHub URL via `git remote get-url origin`
 *   - Detects category via heuristics
 *   - Generates shortDescription from first meaningful paragraph
 *   - Merges into builder_profiles draft_json projects array
 *   - Preserves manually-edited projects (only touches autoSynced ones)
 *
 * Usage: node scripts/auto-sync.js [--dry-run]
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import pg from "pg";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PROJECTS_DIR = "C:/Users/pceci/Claude/Projects";
const DATABASE_URL =
  "postgresql://postgres.hrntbiebmqbrmutdddcc:Wilmette21!@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const USER_EMAIL = "p.cecil@yahoo.com";
const DRY_RUN = process.argv.includes("--dry-run");

const SKIP_DIRS = new Set([
  "env-vault",
  "claude-code-best-practice",
  "claude-code-templates",
  "pete-skills-library",
  "work-hygiene-scan",
  "production-readiness-analyzer",
  "paperclip-sync",
  "scripts",
  "builder-rep", // this project itself
  "tax-output",  // data output, not a project
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a file, return null if missing */
async function readFileSafe(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

/** Get git remote origin URL, return empty string on failure */
function getGitRemoteUrl(dirPath) {
  try {
    const url = execSync("git remote get-url origin", {
      cwd: dirPath,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return url;
  } catch {
    return "";
  }
}

/** Parse package.json safely */
async function readPackageJson(dirPath) {
  const raw = await readFileSafe(path.join(dirPath, "package.json"));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Category detection heuristics
// ---------------------------------------------------------------------------

const CATEGORY_SIGNALS = {
  agent: [
    /\bagent\b/i,
    /\bmulti-agent\b/i,
    /\borchestrat/i,
    /\bautonomous\b/i,
    /\bself-evolv/i,
    /\bself-improv/i,
    /\bself-modif/i,
    /\bLLM loop\b/i,
    /\bagentic\b/i,
  ],
  "public app": [
    /\bpublic\b.*\bapp\b/i,
    /\bPWA\b/,
    /\buser-facing\b/i,
    /\bweb app\b/i,
    /\bconsumer\b/i,
    /\bplatform\b/i,
    /\bordering\b/i,
    /\btrip plan/i,
  ],
  dashboard: [
    /\bdashboard\b/i,
    /\bmonitor\b/i,
    /\bvisuali[sz]/i,
    /\bKPI\b/,
    /\bmetric/i,
    /\bstreamlit\b/i,
  ],
  automation: [
    /\bautomat/i,
    /\bpipeline\b/i,
    /\bbatch\b/i,
    /\bcron\b/i,
    /\bscheduler\b/i,
    /\bscraper\b/i,
    /\bplaywright\b/i,
    /\bcontent gen/i,
  ],
  "internal tool": [
    /\bCLI\b/,
    /\binternal\b/i,
    /\bdev tool\b/i,
    /\bdeveloper tool\b/i,
    /\bMCP\b/,
    /\bbudget\b/i,
    /\btax\b/i,
    /\bport dashboard\b/i,
  ],
  experiment: [
    /\bexperiment\b/i,
    /\bproof.of.concept\b/i,
    /\bprototype\b/i,
    /\bhack\b/i,
    /\bsandbox\b/i,
    /\bevolve\b/i,
  ],
};

function detectCategory(text, dirName) {
  if (!text) return "experiment";

  // Skip generic Next.js boilerplate — treat as if no content
  if (/This is a \[?Next\.js\]?.*bootstrapped with/.test(text) && text.length < 1000) {
    return "experiment";
  }

  // Score each category
  const scores = {};
  for (const [cat, patterns] of Object.entries(CATEGORY_SIGNALS)) {
    scores[cat] = 0;
    for (const pat of patterns) {
      const matches = text.match(new RegExp(pat, "gi"));
      if (matches) scores[cat] += matches.length;
    }
  }

  // Agent should win if it has strong signals (even if automation also matches)
  if (scores["agent"] >= 2) return "agent";

  // Find highest scoring
  let best = "experiment";
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  return bestScore > 0 ? best : "experiment";
}

// ---------------------------------------------------------------------------
// Description extraction
// ---------------------------------------------------------------------------

/**
 * Extract the first meaningful paragraph from CLAUDE.md or README.md.
 * Skips headings, badges, code blocks, blank lines, and metadata.
 */
function extractShortDescription(content) {
  if (!content) return "";

  // Skip generic boilerplate READMEs
  if (/This is a \[?Next\.js\]?.*bootstrapped with/.test(content)) return "";
  if (/This template provides a minimal setup/.test(content)) return "";

  const lines = content.split("\n");
  let inCodeBlock = false;
  let paragraph = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Toggle code blocks
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Skip headings
    if (trimmed.startsWith("#")) continue;

    // Skip badges, images, HTML tags
    if (trimmed.startsWith("[![") || trimmed.startsWith("![")) continue;
    if (trimmed.startsWith("<")) continue;

    // Skip metadata lines
    if (trimmed.startsWith("- **Path**:")) continue;
    if (trimmed.startsWith("- **Repo**:")) continue;
    if (trimmed.startsWith("- **Owner**:")) continue;
    if (trimmed.startsWith(">")) {
      // Blockquotes can be good descriptions
      const cleaned = trimmed.replace(/^>\s*/, "").replace(/\*\*/g, "");
      if (cleaned.length > 20) return truncate(cleaned, 200);
      continue;
    }

    // Skip blank lines -- flush any accumulated paragraph
    if (!trimmed) {
      if (paragraph.length > 0) {
        const text = paragraph.join(" ").replace(/\*\*/g, "").replace(/_/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`/g, "");
        if (text.length > 20) return truncate(text, 200);
        paragraph = [];
      }
      continue;
    }

    // Skip list items that look like metadata or config
    if (trimmed.startsWith("- ") && /^- \*?\*?\w+\*?\*?:/.test(trimmed)) continue;
    if (trimmed.startsWith("- ") && trimmed.length < 50) continue;

    // Skip table rows
    if (trimmed.startsWith("|")) continue;

    // Skip lines that are instructional, not descriptive
    if (/^Do NOT\b|^IMPORTANT:|^NOTE:|^WARNING:/i.test(trimmed)) continue;
    // Skip lines referencing file paths or internal setup instructions
    if (/^Keep repos at|^This file provides guidance/i.test(trimmed)) continue;

    // Accumulate paragraph lines
    paragraph.push(trimmed);
  }

  // Flush remaining
  if (paragraph.length > 0) {
    const text = paragraph.join(" ").replace(/\*\*/g, "").replace(/_/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`/g, "");
    if (text.length > 20) return truncate(text, 200);
  }

  return "";
}

function truncate(str, maxLen) {
  // Clean leading/trailing asterisks and emoji
  str = str.replace(/^\*+|\*+$/g, "").trim();
  str = str.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}◈\s]+/u, "").trim();
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3).replace(/\s+\S*$/, "") + "...";
}

// ---------------------------------------------------------------------------
// Status detection
// ---------------------------------------------------------------------------

function detectStatus(text, pkgJson) {
  if (!text) return "prototype";
  const lower = text.toLowerCase();

  if (/\bdeployed\b|\bproduction\b|\bvercel\.app\b|\blive\b/.test(lower)) return "live";
  if (/\bdemo\b|\bshowcase\b/.test(lower)) return "demo";
  if (/\binternal\b|\bprivate\b/.test(lower)) return "internal";
  return "prototype";
}

// ---------------------------------------------------------------------------
// Tag detection from package.json and content
// ---------------------------------------------------------------------------

const TAG_PATTERNS = {
  "Next.js": /\bnext\.?js\b/i,
  React: /\breact\b/i,
  TypeScript: /\btypescript\b/i,
  Python: /\bpython\b|\bfastapi\b|\bstreamlit\b|\bflask\b/i,
  Supabase: /\bsupabase\b/i,
  SQLite: /\bsqlite\b|\bbetter-sqlite3\b|\bsql\.js\b/i,
  Prisma: /\bprisma\b/i,
  "Claude API": /\bclaude\b.*\bapi\b|\banthropic\b/i,
  Vite: /\bvite\b/i,
  Express: /\bexpress\b/i,
  Tailwind: /\btailwind\b/i,
  MCP: /\bMCP\b|\bmodel context protocol\b/i,
  Rust: /\brust\b|\bcargo\b/i,
  FastAPI: /\bfastapi\b/i,
  Playwright: /\bplaywright\b/i,
  Docker: /\bdocker\b/i,
  "GitHub Actions": /\bgithub actions\b/i,
  ffmpeg: /\bffmpeg\b/i,
  Recharts: /\brecharts\b/i,
  Plotly: /\bplotly\b/i,
  Finance: /\bfinance\b|\bportfolio\b|\btrading\b|\btax\b|\bbudget\b/i,
};

function detectTags(text, pkgJson) {
  const tags = new Set();
  const combined = (text || "") + " " + JSON.stringify(pkgJson || {});

  for (const [tag, pattern] of Object.entries(TAG_PATTERNS)) {
    if (pattern.test(combined)) tags.add(tag);
  }

  // Detect from package.json dependencies
  if (pkgJson?.dependencies) {
    const deps = Object.keys(pkgJson.dependencies);
    if (deps.includes("next")) tags.add("Next.js");
    if (deps.includes("react")) tags.add("React");
    if (deps.includes("express")) tags.add("Express");
    if (deps.some((d) => d.includes("supabase"))) tags.add("Supabase");
    if (deps.includes("prisma") || deps.includes("@prisma/client")) tags.add("Prisma");
    if (deps.includes("better-sqlite3") || deps.includes("sql.js")) tags.add("SQLite");
    if (deps.includes("@anthropic-ai/sdk")) tags.add("Claude API");
    if (deps.includes("playwright")) tags.add("Playwright");
  }
  if (pkgJson?.devDependencies) {
    const devDeps = Object.keys(pkgJson.devDependencies);
    if (devDeps.includes("typescript")) tags.add("TypeScript");
    if (devDeps.includes("tailwindcss")) tags.add("Tailwind");
    if (devDeps.includes("vite")) tags.add("Vite");
  }

  return [...tags].slice(0, 8);
}

// ---------------------------------------------------------------------------
// Build type & capabilities (agent builds only)
// ---------------------------------------------------------------------------

function detectBuildType(text, category) {
  if (category === "agent") return "Agent";
  if (!text) return "";
  if (/\bagent\b/i.test(text) && /\bautonomous\b|\borchestrat|\bmulti-agent/i.test(text)) return "Agent";
  return "";
}

const CAPABILITY_PATTERNS = {
  "Individual Agents": /\bindividual agent\b|\bstandalone agent\b|\bsingle agent\b|\bautonomous agent\b/i,
  "Multi-Agent Systems": /\bmulti-agent\b|\bagents? (?:that )?hand.?off\b|\bagent team\b/i,
  "Orchestration Systems": /\borchestrat/i,
  "External Data Connections": /\bMCP\b|\bAPI\b|\bexternal data\b|\blive.*(?:data|source)/i,
  "Internal Tool Connections": /\bCRM\b|\bSlack\b|\bemail\b|\bdatabase\b|\binternal.*(?:tool|system)/i,
  "Knowledge Bases": /\bRAG\b|\bknowledge base\b|\bdocument ingest/i,
  "Skills / Tool Use": /\btool use\b|\bcode execution\b|\bfile generat\b|\bsearch\b|\baction/i,
};

function detectCapabilities(text) {
  if (!text) return [];
  const caps = [];
  for (const [cap, pattern] of Object.entries(CAPABILITY_PATTERNS)) {
    if (pattern.test(text)) caps.push(cap);
  }
  return caps;
}

// ---------------------------------------------------------------------------
// Title normalization
// ---------------------------------------------------------------------------

function dirNameToTitle(dirName) {
  return dirName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAi\b/g, "AI")
    .replace(/\bMcp\b/g, "MCP")
    .replace(/\bCli\b/g, "CLI")
    .replace(/\bApi\b/g, "API")
    .replace(/\bPwa\b/g, "PWA")
    .replace(/\bNsia\b/g, "NSIA")
    .replace(/\bMsz\b/g, "MSZ")
    .replace(/\bSse\b/g, "SSE");
}

/** Words that indicate a garbage/generic H1 title */
const BAD_TITLES = /^(claude|readme|instructions|this|getting|or|open|auto|react)\b/i;

/**
 * Try to extract the project title from the first H1 in the doc.
 * Falls back to dirNameToTitle.
 */
function extractTitle(content, dirName) {
  if (content) {
    // Match only H1 lines (single # followed by space)
    const h1Match = content.match(/^# +(.+)$/m);
    if (h1Match) {
      let raw = h1Match[1].trim().replace(/[`*]/g, "");

      // If it has a dash/emdash separator, take just the first part
      const dashSplit = raw.match(/^(.+?)\s*[—–]\s/);
      let title = dashSplit ? dashSplit[1].trim() : raw;
      title = title.replace(/^\W+/, "");
      title = cleanEmoji(title);

      if (!BAD_TITLES.test(title) && title.length >= 3 && title.length < 80) {
        return title;
      }
    }
  }
  return dirNameToTitle(dirName);
}

/** Remove leading emoji characters */
function cleanEmoji(str) {
  return str.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}◈\s]+/u, "").trim();
}

// ---------------------------------------------------------------------------
// Scan a single project
// ---------------------------------------------------------------------------

async function scanProject(dirPath, dirName) {
  const claudeMd = await readFileSafe(path.join(dirPath, "CLAUDE.md"));
  const readmeMd = await readFileSafe(path.join(dirPath, "README.md"));
  const pkgJson = await readPackageJson(dirPath);

  const docContent = claudeMd || readmeMd || "";
  const githubUrl = getGitRemoteUrl(dirPath);

  const title = extractTitle(docContent, dirName);
  const category = detectCategory(docContent, dirName);
  const shortDescription = extractShortDescription(docContent);
  const status = detectStatus(docContent, pkgJson);
  const tags = detectTags(docContent, pkgJson);
  const buildType = detectBuildType(docContent, category);
  const capabilities = buildType === "Agent" ? detectCapabilities(docContent) : [];

  return {
    id: `autosync-${dirName}`,
    kind: "project",
    primaryType: "",
    buildProfileType: buildType,
    focusAreas: [],
    title,
    category,
    githubRepoUrl: githubUrl,
    shortDescription,
    longDescription: "",
    problem: "",
    whatItIs: "",
    whyItMatters: "",
    whatItDemonstrates: "",
    whyBuiltThisWay: "",
    whatChuckieKnows: shortDescription,
    status,
    featured: false,
    buildType,
    capabilities,
    tags,
    tools: [],
    systems: [],
    designNotes: [],
    artifacts: [],
    primaryLink: {
      type: "website",
      title,
      url: githubUrl,
      description: "",
    },
    supportingLinks: [],
    visuals: [],
    autoSynced: true,
    syncedAt: new Date().toISOString(),
    sourceDir: dirName,
  };
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

/**
 * Merge scanned projects into existing projects array.
 * - Manual projects (autoSynced !== true) are preserved untouched.
 * - Auto-synced projects are matched by title (case-insensitive) or sourceDir.
 * - New auto-synced projects are appended.
 */
function mergeProjects(existing, scanned) {
  const manualProjects = existing.filter((p) => !p.autoSynced);
  const existingAutoSynced = existing.filter((p) => p.autoSynced);

  // Build lookup for existing auto-synced by sourceDir and title
  const bySrcDir = new Map();
  const byTitle = new Map();
  for (const p of existingAutoSynced) {
    if (p.sourceDir) bySrcDir.set(p.sourceDir, p);
    byTitle.set(p.title.toLowerCase(), p);
  }

  // Also check manual projects by title for overlap detection
  const manualTitles = new Set(manualProjects.map((p) => p.title.toLowerCase()));

  const updatedAutoSynced = [];
  let newCount = 0;
  let updateCount = 0;
  let skippedManual = 0;

  for (const scannedProject of scanned) {
    // If a manual project with same title exists, skip (don't overwrite manual edits)
    if (manualTitles.has(scannedProject.title.toLowerCase())) {
      skippedManual++;
      continue;
    }

    // Check if we already have an auto-synced version
    const existingBySrc = bySrcDir.get(scannedProject.sourceDir);
    const existingByTitle = byTitle.get(scannedProject.title.toLowerCase());
    const match = existingBySrc || existingByTitle;

    if (match) {
      // Update: preserve the original id and any manual enrichment fields
      const merged = {
        ...match,
        ...scannedProject,
        id: match.id, // keep stable ID
        // Preserve manual enrichment if present
        longDescription: match.longDescription || scannedProject.longDescription,
        whatItIs: match.whatItIs || scannedProject.whatItIs,
        whyItMatters: match.whyItMatters || scannedProject.whyItMatters,
        whatItDemonstrates: match.whatItDemonstrates || scannedProject.whatItDemonstrates,
        whyBuiltThisWay: match.whyBuiltThisWay || scannedProject.whyBuiltThisWay,
        featured: match.featured,
      };
      updatedAutoSynced.push(merged);
      updateCount++;
    } else {
      updatedAutoSynced.push(scannedProject);
      newCount++;
    }
  }

  console.log(
    `  Merge: ${manualProjects.length} manual (preserved), ${updateCount} updated, ${newCount} new, ${skippedManual} skipped (manual match)`
  );

  return [...manualProjects, ...updatedAutoSynced];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Auto-sync: scanning", PROJECTS_DIR);
  if (DRY_RUN) console.log("  ** DRY RUN — no DB writes **\n");

  // 1. Discover project directories
  const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !SKIP_DIRS.has(name));

  console.log(`  Found ${dirs.length} project directories (${entries.length - dirs.length} skipped)\n`);

  // 2. Scan each project
  const scanned = [];
  for (const dirName of dirs) {
    const dirPath = path.join(PROJECTS_DIR, dirName);
    try {
      const project = await scanProject(dirPath, dirName);
      scanned.push(project);
      const descPreview = project.shortDescription
        ? project.shortDescription.slice(0, 60) + "..."
        : "(no description)";
      console.log(
        `  [${project.category.padEnd(14)}] ${project.title.padEnd(35)} ${descPreview}`
      );
    } catch (err) {
      console.error(`  ERROR scanning ${dirName}:`, err.message);
    }
  }

  console.log(`\n  Scanned ${scanned.length} projects\n`);

  // 3. Connect to Postgres and merge
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Find user and builder profile
    const userResult = await client.query(
      "SELECT au.id AS user_id, bp.id AS profile_id, bp.slug, bp.draft_json FROM app_users au JOIN builder_profiles bp ON bp.user_id = au.id WHERE au.email = $1",
      [USER_EMAIL]
    );

    if (userResult.rows.length === 0) {
      console.error("User or builder profile not found for", USER_EMAIL);
      process.exit(1);
    }

    const { profile_id, slug, draft_json } = userResult.rows[0];
    const draft = typeof draft_json === "string" ? JSON.parse(draft_json) : draft_json;

    console.log(`  Builder: ${slug} (${profile_id})`);
    console.log(`  Existing projects: ${draft.projects?.length || 0}\n`);

    // 4. Merge
    const existingProjects = draft.projects || [];
    const merged = mergeProjects(existingProjects, scanned);

    draft.projects = merged;
    console.log(`  Final project count: ${merged.length}\n`);

    // 5. Write back
    if (DRY_RUN) {
      console.log("  DRY RUN: Would update draft_json with merged projects.");
      console.log("  Sample new projects:");
      const newOnes = merged.filter((p) => p.autoSynced && !existingProjects.some((e) => e.id === p.id));
      for (const p of newOnes.slice(0, 5)) {
        console.log(`    - ${p.title} [${p.category}] ${p.shortDescription.slice(0, 50)}...`);
      }
    } else {
      const now = new Date().toISOString();
      await client.query(
        "UPDATE builder_profiles SET draft_json = $1, updated_at = $2 WHERE id = $3",
        [JSON.stringify(draft), now, profile_id]
      );
      console.log("  Draft updated in Postgres at", now);
      console.log(`  Visit https://builder-rep-two.vercel.app/studio to review.`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
