import {
  normalizeBuildProfileType,
  normalizeFocusAreas,
  normalizeKind,
  resolveRadarFields,
} from "@/lib/build-taxonomy";
import {
  BUILDER_SCHEMA_VERSION,
  buildEmptyGithub,
  buildEmptyOnboarding,
  buildEmptyProfile,
  buildEmptyToolStack,
  normalizeGithub,
  normalizeOnboarding,
  normalizeProfile,
  normalizeToolStack,
  syncBuilderFromProfile,
} from "@/lib/builder-profile";
import { slugify, titleCaseFromEmail } from "@/lib/slug";

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stripLegacyPlaceholder(value, placeholders = []) {
  const normalized = asString(value, "");
  return placeholders.includes(normalized) ? "" : normalized;
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => typeof item === "string" && item.trim());
}

function normalizeProjectLink(value, fallbackTitle) {
  const raw = value && typeof value === "object" ? value : {};

  return {
    type: asString(raw.type, "website"),
    title: asString(raw.title, fallbackTitle),
    url: asString(raw.url, ""),
    description: stripLegacyPlaceholder(raw.description, ["Primary link captured during onboarding."]),
  };
}

function normalizeProject(project, index) {
  const raw = project && typeof project === "object" ? project : {};
  const title = asString(raw.title, `Project ${index + 1}`);
  const slug = slugify(raw.id || title || `project-${index + 1}`);
  const buildProfileType = normalizeBuildProfileType(raw.buildProfileType);
  const kind = buildProfileType === "Agent" ? "agent" : normalizeKind(raw.kind);
  const focusAreas = normalizeFocusAreas(raw.focusAreas);
  const radar = resolveRadarFields({
    buildType: buildProfileType,
    capabilities: raw.capabilities,
  });

  return {
    id: slug,
    kind,
    primaryType: buildProfileType,
    buildProfileType,
    focusAreas,
    title,
    category: asString(raw.category, "experiment"),
    githubRepoUrl: asString(raw.githubRepoUrl, ""),
    shortDescription: asString(raw.shortDescription, "Project summary coming soon."),
    longDescription: asString(raw.longDescription, `${title} is still being drafted in Builder Studio.`),
    problem: asString(raw.problem, "Waiting for builder context."),
    whatItIs: asString(raw.whatItIs, "Drafted from conversation."),
    whyItMatters: asString(raw.whyItMatters, "Waiting for builder emphasis."),
    whatItDemonstrates: asString(raw.whatItDemonstrates, "Waiting for builder emphasis."),
    whyBuiltThisWay: asString(raw.whyBuiltThisWay, "Waiting for design rationale."),
    whatChuckieKnows: asString(raw.whatChuckieKnows, ""),
    status: asString(raw.status, "prototype"),
    featured: Boolean(raw.featured),
    buildType: radar.buildType,
    capabilities: radar.capabilities,
    tags: asStringArray(raw.tags),
    tools: asStringArray(raw.tools),
    systems: asStringArray(raw.systems),
    designNotes: asStringArray(raw.designNotes),
    artifacts: asStringArray(raw.artifacts),
    primaryLink: normalizeProjectLink(raw.primaryLink, `Open ${title}`),
    supportingLinks: Array.isArray(raw.supportingLinks)
      ? raw.supportingLinks.map((link) => normalizeProjectLink(link, title))
      : [],
    visuals: Array.isArray(raw.visuals)
      ? raw.visuals.map((visual) => ({
          title: stripLegacyPlaceholder(visual?.title, ["Imported artifact"]),
          description: stripLegacyPlaceholder(visual?.description, ["Attach screenshots or references later."]),
          url: asString(visual?.url, ""),
          path: asString(visual?.path, ""),
        }))
      : [],
  };
}

export function buildDefaultBuilder({ userId, email }) {
  const displayName = titleCaseFromEmail(email);
  const slug = slugify(displayName);
  return syncBuilderFromProfile({
    schemaVersion: BUILDER_SCHEMA_VERSION,
    id: `builder-${userId}`,
    name: displayName,
    displayName,
    slug,
    shortBio: "Builder profile in progress.",
    longerIntro: "",
    featuredIntroLine: `I'm Chuckie. ${displayName} is teaching me how to represent the work clearly. Ask again once the studio draft is ready.`,
    whatChuckieKnows: "",
    themes: [],
    highlightedThemes: [
      "Projects are the main proof",
      "Real artifacts beat descriptions",
      "The why matters as much as the what",
    ],
    preferredOpeningProjects: [],
    voiceNotes: [
      "Direct and editorial without sounding like a recruiter",
      "Connect broad ideas back to real work",
      "Prefer showing projects and artifacts over generic summaries",
    ],
    promptStarts: [
      `What should I understand first about ${displayName}?`,
      `What are ${displayName}'s best examples of real work?`,
      `Show me the full ecosystem for ${displayName}.`,
      `What kind of builder is ${displayName}?`,
    ],
    profile: buildEmptyProfile(),
    toolStack: buildEmptyToolStack(),
    github: buildEmptyGithub(),
    onboarding: buildEmptyOnboarding(),
    projects: [],
  });
}

export function normalizeBuilder(rawBuilder, fallbackBuilder) {
  const source = rawBuilder && typeof rawBuilder === "object" ? rawBuilder : {};
  const fallback = fallbackBuilder ?? buildDefaultBuilder({ userId: "draft", email: "builder@example.com" });
  const displayName = asString(source.displayName || source.name, fallback.displayName);
  const slug = slugify(source.slug || displayName || fallback.slug);

  return syncBuilderFromProfile({
    ...fallback,
    schemaVersion:
      typeof source.schemaVersion === "number" && Number.isFinite(source.schemaVersion)
        ? source.schemaVersion
        : 0,
    id: asString(source.id, fallback.id),
    name: displayName,
    displayName,
    slug,
    shortBio: asString(source.shortBio, fallback.shortBio),
    longerIntro: asString(source.longerIntro, fallback.longerIntro),
    featuredIntroLine: asString(source.featuredIntroLine, fallback.featuredIntroLine),
    whatChuckieKnows: asString(source.whatChuckieKnows, fallback.whatChuckieKnows),
    themes: asStringArray(source.themes),
    highlightedThemes: asStringArray(source.highlightedThemes).length
      ? asStringArray(source.highlightedThemes)
      : fallback.highlightedThemes,
    preferredOpeningProjects: asStringArray(source.preferredOpeningProjects),
    voiceNotes: asStringArray(source.voiceNotes).length ? asStringArray(source.voiceNotes) : fallback.voiceNotes,
    promptStarts: asStringArray(source.promptStarts).length ? asStringArray(source.promptStarts) : fallback.promptStarts,
    profile: normalizeProfile(source.profile),
    toolStack: normalizeToolStack(source.toolStack),
    github: normalizeGithub(source.github),
    onboarding: normalizeOnboarding(source.onboarding),
    projects: Array.isArray(source.projects)
      ? source.projects.map((project, index) => normalizeProject(project, index))
      : [],
    chatHistory: normalizeChatHistory(source.chatHistory),
  });
}

function normalizeChatHistory(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.text === "string" &&
        entry.text.trim(),
    )
    .slice(-40)
    .map((entry) => ({
      role: entry.role,
      text: entry.text.trim(),
      ...(entry.kind === "recap" && entry.recap ? { kind: "recap", recap: entry.recap } : {}),
    }));
}
