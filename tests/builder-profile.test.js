import { describe, expect, it } from "vitest";
import {
  buildEmptyProfile,
  buildInterviewRecap,
  buildInterviewQuestion,
  getNextInterviewField,
  hasInterviewSignal,
  normalizeProfile,
  normalizeToolStack,
  normalizeGithub,
  normalizeOnboarding,
  projectHasInterviewSignal,
  PROFILE_FIELD_ORDER,
} from "@/lib/builder-profile";

function makeBuilder(overrides = {}) {
  return {
    displayName: "Test Builder",
    profile: buildEmptyProfile(),
    toolStack: { regular: [], familiar: [] },
    github: { profileUrl: "", repoUrls: [] },
    onboarding: { currentStep: "basics", interviewResponses: 0, skippedToProjects: false, studioReady: false },
    projects: [],
    ...overrides,
  };
}

describe("normalizeProfile", () => {
  it("returns empty profile for null", () => {
    const result = normalizeProfile(null);
    expect(result.background).toBe("");
    expect(result.originStory).toBe("");
  });

  it("trims string values", () => {
    const result = normalizeProfile({ background: "  hello  ", currentFocus: 42 });
    expect(result.background).toBe("hello");
    expect(result.currentFocus).toBe("");
  });

  it("normalizes a well-formed profile", () => {
    const input = { background: "Engineer", aiRelationship: "Technical", currentFocus: "Agents" };
    const result = normalizeProfile(input);
    expect(result.background).toBe("Engineer");
    expect(result.aiRelationship).toBe("Technical");
    expect(result.currentFocus).toBe("Agents");
    expect(result.notableBuild).toBe("");
  });
});

describe("normalizeToolStack", () => {
  it("returns empty for null", () => {
    const result = normalizeToolStack(null);
    expect(result.regular).toEqual([]);
    expect(result.familiar).toEqual([]);
  });

  it("filters invalid tools", () => {
    const result = normalizeToolStack({ regular: ["Claude", "FakeTool"], familiar: ["Python"] });
    expect(result.regular).toEqual(["Claude"]);
    expect(result.familiar).toEqual(["Python"]);
  });

  it("removes familiar tools that are in regular", () => {
    const result = normalizeToolStack({ regular: ["Claude"], familiar: ["Claude", "Python"] });
    expect(result.regular).toEqual(["Claude"]);
    expect(result.familiar).toEqual(["Python"]);
  });
});

describe("normalizeGithub", () => {
  it("returns empty for null", () => {
    const result = normalizeGithub(null);
    expect(result.profileUrl).toBe("");
    expect(result.repoUrls).toEqual([]);
  });
});

describe("normalizeOnboarding", () => {
  it("returns defaults for garbage input", () => {
    const result = normalizeOnboarding("garbage");
    expect(result.currentStep).toBe("basics");
    expect(result.interviewResponses).toBe(0);
  });

  it("clamps negative interviewResponses", () => {
    const result = normalizeOnboarding({ interviewResponses: -5 });
    expect(result.interviewResponses).toBe(0);
  });

  it("rejects invalid steps", () => {
    const result = normalizeOnboarding({ currentStep: "invalid" });
    expect(result.currentStep).toBe("basics");
  });
});

describe("hasInterviewSignal", () => {
  it("returns false for empty builder", () => {
    expect(hasInterviewSignal(makeBuilder())).toBe(false);
  });

  it("returns true with one profile field", () => {
    expect(hasInterviewSignal(makeBuilder({ profile: { ...buildEmptyProfile(), background: "Engineer" } }))).toBe(true);
  });

  it("returns true with tool stack", () => {
    expect(hasInterviewSignal(makeBuilder({ toolStack: { regular: ["Claude"], familiar: [] } }))).toBe(true);
  });

  it("returns true with github profile", () => {
    expect(hasInterviewSignal(makeBuilder({ github: { profileUrl: "https://github.com/test", repoUrls: [] } }))).toBe(true);
  });
});

describe("projectHasInterviewSignal", () => {
  it("returns false for null", () => {
    expect(projectHasInterviewSignal(null)).toBe(false);
  });

  it("returns false for placeholder-only project", () => {
    expect(projectHasInterviewSignal({ title: "New Build", shortDescription: "Project summary coming soon." })).toBe(false);
  });

  it("returns true for project with real description", () => {
    expect(projectHasInterviewSignal({ title: "My Agent", shortDescription: "An agent that does X" })).toBe(true);
  });

  it("returns true for project with github URL", () => {
    expect(projectHasInterviewSignal({ title: "New Build", githubRepoUrl: "https://github.com/foo/bar" })).toBe(true);
  });

  it("returns false for Project N pattern titles with no other signal", () => {
    expect(projectHasInterviewSignal({ title: "Project 1" })).toBe(false);
  });
});

describe("buildInterviewRecap", () => {
  it("returns empty headline for empty builder", () => {
    const recap = buildInterviewRecap(makeBuilder());
    expect(recap.headline).toBe("Chuckie is just getting started");
    expect(recap.bullets).toEqual([]);
  });

  it("returns bullets for populated builder", () => {
    const recap = buildInterviewRecap(makeBuilder({
      profile: { ...buildEmptyProfile(), currentFocus: "Building agents", background: "Software engineer" },
      toolStack: { regular: ["Claude"], familiar: [] },
    }));
    expect(recap.headline).toBe("What I think I know so far");
    expect(recap.bullets.length).toBeGreaterThan(0);
    expect(recap.bullets.some((b) => b.includes("building agents"))).toBe(true);
  });
});

describe("getNextInterviewField", () => {
  it("returns first field for empty builder", () => {
    expect(getNextInterviewField(makeBuilder())).toBe("background");
  });

  it("skips filled fields", () => {
    const builder = makeBuilder({
      profile: { ...buildEmptyProfile(), background: "Engineer", aiRelationship: "Technical" },
    });
    expect(getNextInterviewField(builder)).toBe("currentFocus");
  });

  it("returns last field when all filled", () => {
    const profile = {};
    for (const field of PROFILE_FIELD_ORDER) {
      profile[field] = "filled";
    }
    expect(getNextInterviewField(makeBuilder({ profile }))).toBe("originStory");
  });
});

describe("buildInterviewQuestion", () => {
  it("returns a question for each field", () => {
    const builder = makeBuilder();
    for (const field of PROFILE_FIELD_ORDER) {
      const question = buildInterviewQuestion(field, builder);
      expect(typeof question).toBe("string");
      expect(question.length).toBeGreaterThan(10);
    }
  });

  it("adapts aiRelationship question to tool stack", () => {
    const builder = makeBuilder({ toolStack: { regular: ["Claude", "Python"], familiar: [] } });
    const question = buildInterviewQuestion("aiRelationship", builder);
    expect(question).toContain("Claude");
  });
});
