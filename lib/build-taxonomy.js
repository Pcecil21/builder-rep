import { normalizeBuildType, normalizeCapabilities } from "@/lib/radar";

export const BUILD_KINDS = ["agent", "project"];

export const PRIMARY_TYPES = [
  { id: "Agent", label: "Agent", icon: "⚡" },
  { id: "Agent Team", label: "Agent Team", icon: "🔗" },
  { id: "Vibe-Coded", label: "Vibe-Coded", icon: "🌀" },
  { id: "Creative", label: "Creative", icon: "🎨" },
  { id: "Other", label: "Other", icon: "•" },
];

export const FOCUS_AREAS = [
  { id: "research", label: "Research", icon: "🔬" },
  { id: "data-analysis", label: "Data Analysis", icon: "📊" },
  { id: "writing", label: "Writing", icon: "✍️" },
  { id: "content-creation", label: "Content Creation", icon: "📝" },
  { id: "coding-dev", label: "Coding / Dev", icon: "💻" },
  { id: "design", label: "Design", icon: "🎨" },
  { id: "automation", label: "Automation", icon: "⚙️" },
  { id: "strategy", label: "Strategy", icon: "🧭" },
  { id: "search-retrieval", label: "Search / Retrieval", icon: "🔎" },
  { id: "comms-chat", label: "Comms / Chat", icon: "💬" },
  { id: "planning", label: "Planning", icon: "📋" },
  { id: "sales-marketing", label: "Sales / Marketing", icon: "📣" },
  { id: "operations", label: "Operations", icon: "🏭" },
  { id: "education", label: "Education", icon: "🎓" },
  { id: "audio-voice", label: "Audio / Voice", icon: "🎙️" },
  { id: "video-media", label: "Video / Media", icon: "🎬" },
  { id: "productivity", label: "Productivity", icon: "⚡" },
  { id: "enterprise-tool", label: "Enterprise Tool", icon: "🏢" },
  { id: "consumer-app", label: "Consumer App", icon: "📱" },
  { id: "other", label: "Other", icon: "✦" },
];

const PRIMARY_TYPE_IDS = new Set(PRIMARY_TYPES.map((item) => item.id));
const FOCUS_AREA_IDS = new Set(FOCUS_AREAS.map((item) => item.id));
const FOCUS_AREA_ORDER = new Map(FOCUS_AREAS.map((item, index) => [item.id, index]));
const BUILD_KIND_IDS = new Set(BUILD_KINDS);

const FOCUS_TO_CAPABILITIES = {
  research: ["research"],
  "data-analysis": ["data", "research"],
  writing: ["content"],
  "content-creation": ["content"],
  "coding-dev": ["orchestration"],
  design: ["content"],
  automation: ["automation"],
  strategy: ["strategy"],
  "search-retrieval": ["research", "data"],
  "comms-chat": ["community"],
  planning: ["strategy"],
  "sales-marketing": ["strategy", "community"],
  operations: ["automation", "orchestration"],
  education: ["community", "content"],
  "audio-voice": ["content"],
  "video-media": ["content"],
  productivity: ["automation"],
  "enterprise-tool": ["data", "strategy"],
  "consumer-app": ["community"],
  other: [],
};

function asOrderedUnique(items, orderMap) {
  return [...new Set(items)].sort((left, right) => (orderMap.get(left) ?? 999) - (orderMap.get(right) ?? 999));
}

export function normalizeKind(value) {
  return typeof value === "string" && BUILD_KIND_IDS.has(value) ? value : "project";
}

export function normalizePrimaryType(value) {
  return typeof value === "string" && PRIMARY_TYPE_IDS.has(value) ? value : "";
}

export function normalizeFocusAreas(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return asOrderedUnique(
    value.filter((item) => typeof item === "string" && FOCUS_AREA_IDS.has(item)),
    FOCUS_AREA_ORDER,
  );
}

export function deriveRadarBuildType({ kind, primaryType, focusAreas }) {
  const normalizedKind = normalizeKind(kind);
  const normalizedPrimaryType = normalizePrimaryType(primaryType);
  const normalizedFocusAreas = normalizeFocusAreas(focusAreas);

  if (normalizedPrimaryType === "Agent Team") {
    return "Multi-Agent";
  }

  if (normalizedPrimaryType === "Agent" || normalizedKind === "agent") {
    return "Agent";
  }

  if (normalizedFocusAreas.some((item) => ["automation", "operations", "productivity"].includes(item))) {
    return "Automation";
  }

  if (normalizedPrimaryType && ["Vibe-Coded", "Creative", "Other"].includes(normalizedPrimaryType)) {
    return "Public App";
  }

  return "";
}

export function deriveRadarCapabilities(focusAreas) {
  return normalizeCapabilities(
    normalizeFocusAreas(focusAreas).flatMap((focusArea) => FOCUS_TO_CAPABILITIES[focusArea] ?? []),
  );
}

export function resolveRadarFields(project) {
  const explicitBuildType = normalizeBuildType(project.buildType);
  const explicitCapabilities = normalizeCapabilities(project.capabilities);

  return {
    buildType:
      explicitBuildType ||
      deriveRadarBuildType({
        kind: project.kind,
        primaryType: project.primaryType,
        focusAreas: project.focusAreas,
      }),
    capabilities:
      explicitCapabilities.length ? explicitCapabilities : deriveRadarCapabilities(project.focusAreas),
  };
}
