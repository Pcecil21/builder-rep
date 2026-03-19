import { RADAR_AXES, normalizeBuildType, normalizeCapabilities } from "@/lib/radar";

export const BUILD_KINDS = ["agent", "project"];

export const BUILD_TYPES = [
  { id: "Agent", label: "Agent", icon: "⚡" },
  { id: "AI Product/App", label: "AI Product/App", icon: "🖥️" },
  { id: "Workflow / Automation", label: "Workflow / Automation", icon: "⚙️" },
  { id: "Creative", label: "Creative", icon: "🎨" },
];

export const PRIMARY_TYPES = BUILD_TYPES;

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

export const CAPABILITY_MARKERS = RADAR_AXES.map(({ id, label, icon }) => ({
  id,
  label,
  icon,
}));

const BUILD_TYPE_IDS = new Set(BUILD_TYPES.map((item) => item.id));
const FOCUS_AREA_IDS = new Set(FOCUS_AREAS.map((item) => item.id));
const FOCUS_AREA_ORDER = new Map(FOCUS_AREAS.map((item, index) => [item.id, index]));
const BUILD_KIND_IDS = new Set(BUILD_KINDS);

function asOrderedUnique(items, orderMap) {
  return [...new Set(items)].sort((left, right) => (orderMap.get(left) ?? 999) - (orderMap.get(right) ?? 999));
}

export function normalizeKind(value) {
  return typeof value === "string" && BUILD_KIND_IDS.has(value) ? value : "project";
}

export function normalizeBuildProfileType(value) {
  return typeof value === "string" && BUILD_TYPE_IDS.has(value) ? value : "";
}

export function normalizePrimaryType(value) {
  return normalizeBuildProfileType(value);
}

export function normalizeFocusAreas(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return asOrderedUnique(
    value.filter((item) => typeof item === "string" && FOCUS_AREA_IDS.has(item)),
    FOCUS_AREA_ORDER,
  ).slice(0, 3);
}

export function getFocusAreaProjects(builder) {
  const result = {};

  for (const project of builder.projects) {
    const areas = normalizeFocusAreas(project.focusAreas);
    for (const areaId of areas) {
      if (!result[areaId]) {
        result[areaId] = [];
      }
      result[areaId].push({
        id: project.id,
        title: project.title,
        shortDescription: project.shortDescription,
      });
    }
  }

  return result;
}

export function resolveRadarFields(project) {
  const buildType = normalizeBuildType(project.buildType);
  const capabilities = normalizeCapabilities(project.capabilities);

  return {
    buildType,
    capabilities,
  };
}
