export const RADAR_AXES = [
  { id: "research", label: "Research & Analysis", short: "Research", icon: "🔍" },
  { id: "content", label: "Content & Generation", short: "Content", icon: "✦" },
  { id: "automation", label: "Automation", short: "Automation", icon: "⚙️" },
  { id: "orchestration", label: "Orchestration", short: "Orchestration", icon: "🎛️" },
  { id: "community", label: "Community", short: "Community", icon: "🤝" },
  { id: "data", label: "Data & Integration", short: "Data", icon: "🔗" },
  { id: "strategy", label: "Strategy & Planning", short: "Strategy", icon: "🧭" },
];

export const RADAR_BUILD_TYPES = ["Agent", "Multi-Agent", "Automation", "Public App"];

export const RADAR_BUILD_TYPE_STYLES = {
  Agent: { bg: "#E8F5F0", text: "#2D8B6F", border: "#C5E8DB" },
  "Multi-Agent": { bg: "#FFF0EC", text: "#D4603A", border: "#FFD9CC" },
  Automation: { bg: "#EDF6FF", text: "#3B82B5", border: "#CCE4F7" },
  "Public App": { bg: "#F3F0FF", text: "#7C5CFC", border: "#DDD6FE" },
};

const AXIS_IDS = new Set(RADAR_AXES.map((axis) => axis.id));
const BUILD_TYPE_IDS = new Set(RADAR_BUILD_TYPES);
const AXIS_ORDER = new Map(RADAR_AXES.map((axis, index) => [axis.id, index]));

export function normalizeBuildType(value) {
  return typeof value === "string" && BUILD_TYPE_IDS.has(value) ? value : "";
}

export function normalizeCapabilities(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item) => typeof item === "string" && AXIS_IDS.has(item.trim())))]
    .sort((left, right) => (AXIS_ORDER.get(left) ?? 999) - (AXIS_ORDER.get(right) ?? 999));
}

export function getRadarProjects(builder) {
  return builder.projects.filter((project) => project.buildType && project.capabilities.length);
}

export function getPortfolioPathForSlug(slug) {
  return `/rep/${slug}/portfolio`;
}

export function getAxisById(axisId) {
  return RADAR_AXES.find((axis) => axis.id === axisId) ?? null;
}
