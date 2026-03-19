import { describe, expect, it } from "vitest";
import {
  normalizeBuildProfileType,
  normalizeFocusAreas,
  normalizeKind,
} from "@/lib/build-taxonomy";
import {
  normalizeBuildType,
  normalizeCapabilities,
} from "@/lib/radar";

describe("normalizeBuildType", () => {
  it("accepts valid build types", () => {
    expect(normalizeBuildType("Agent")).toBe("Agent");
    expect(normalizeBuildType("AI Product/App")).toBe("AI Product/App");
    expect(normalizeBuildType("Creative")).toBe("Creative");
  });

  it("rejects invalid build types", () => {
    expect(normalizeBuildType("")).toBe("");
    expect(normalizeBuildType("InvalidType")).toBe("");
    expect(normalizeBuildType(null)).toBe("");
    expect(normalizeBuildType(42)).toBe("");
  });
});

describe("normalizeBuildProfileType", () => {
  it("accepts valid types", () => {
    expect(normalizeBuildProfileType("Agent")).toBe("Agent");
    expect(normalizeBuildProfileType("Workflow / Automation")).toBe("Workflow / Automation");
  });

  it("rejects invalid", () => {
    expect(normalizeBuildProfileType("")).toBe("");
    expect(normalizeBuildProfileType("Bogus")).toBe("");
  });
});

describe("normalizeCapabilities", () => {
  it("filters valid capabilities", () => {
    const result = normalizeCapabilities(["individual-agents", "bogus", "knowledge-bases"]);
    expect(result).toEqual(["individual-agents", "knowledge-bases"]);
  });

  it("returns empty for non-array", () => {
    expect(normalizeCapabilities(null)).toEqual([]);
    expect(normalizeCapabilities("string")).toEqual([]);
  });

  it("deduplicates", () => {
    const result = normalizeCapabilities(["individual-agents", "individual-agents"]);
    expect(result).toEqual(["individual-agents"]);
  });

  it("sorts by radar axis order", () => {
    const result = normalizeCapabilities(["skills-tool-use", "individual-agents"]);
    expect(result[0]).toBe("individual-agents");
    expect(result[1]).toBe("skills-tool-use");
  });
});

describe("normalizeFocusAreas", () => {
  it("accepts valid focus areas", () => {
    const result = normalizeFocusAreas(["research", "coding-dev"]);
    expect(result).toEqual(["research", "coding-dev"]);
  });

  it("rejects invalid", () => {
    expect(normalizeFocusAreas(["research", "invalid"])).toEqual(["research"]);
  });

  it("caps at 3", () => {
    const result = normalizeFocusAreas(["research", "coding-dev", "design", "automation"]);
    expect(result.length).toBe(3);
  });

  it("returns empty for non-array", () => {
    expect(normalizeFocusAreas(null)).toEqual([]);
  });
});

describe("normalizeKind", () => {
  it("accepts agent and project", () => {
    expect(normalizeKind("agent")).toBe("agent");
    expect(normalizeKind("project")).toBe("project");
  });

  it("defaults to project for invalid", () => {
    expect(normalizeKind("invalid")).toBe("project");
    expect(normalizeKind(null)).toBe("project");
  });
});
