export const RADAR_AXES = [
  { id: "individual-agents", label: "Individual Agents", short: "Individual", icon: "🤖" },
  { id: "multi-agent-systems", label: "Multi-Agent Systems", short: "Multi-Agent", icon: "🔀" },
  {
    id: "orchestration-systems",
    label: "Orchestration Systems",
    short: "Orchestration",
    icon: "🎛️",
  },
  {
    id: "external-data-connections",
    label: "External Data Connections",
    short: "External Data",
    icon: "🌐",
  },
  {
    id: "internal-tool-connections",
    label: "Internal Tool Connections",
    short: "Internal Tools",
    icon: "🏢",
  },
  { id: "knowledge-bases", label: "Knowledge Bases", short: "Knowledge", icon: "📚" },
  { id: "skills-tool-use", label: "Skills / Tool Use", short: "Tool Use", icon: "🛠️" },
];

export const RADAR_BUILD_TYPES = [
  "Agent",
  "AI Product/App",
  "Workflow / Automation",
  "Creative",
];

export const RADAR_BUILD_TYPE_STYLES = {
  Agent: { bg: "#E8F5F0", text: "#2D8B6F", border: "#C5E8DB" },
  "AI Product/App": { bg: "#F3F0FF", text: "#7C5CFC", border: "#DDD6FE" },
  "Workflow / Automation": { bg: "#EDF6FF", text: "#3B82B5", border: "#CCE4F7" },
  Creative: { bg: "#FFF3E8", text: "#C26A23", border: "#FFDDBF" },
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

export function getVisibleCapabilities(project) {
  if (!project || normalizeBuildType(project.buildType) !== "Agent") {
    return [];
  }

  return normalizeCapabilities(project.capabilities);
}

export function getRadarProjects(builder) {
  return builder.projects.filter((project) => normalizeBuildType(project.buildType));
}

export function getPortfolioPathForSlug(slug) {
  return `/rep/${slug}/portfolio`;
}

export function getAxisById(axisId) {
  return RADAR_AXES.find((axis) => axis.id === axisId) ?? null;
}
