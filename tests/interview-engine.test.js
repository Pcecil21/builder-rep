import { describe, expect, it } from "vitest";
import {
  assessTopicCoverage,
  selectNextTopic,
  generateQuestion,
  extractProfileUpdates,
  shouldTransitionToBuilds,
  buildEngineContext,
} from "@/lib/server/interview-engine";
import { buildEmptyProfile, PROFILE_FIELD_ORDER } from "@/lib/builder-profile";

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

describe("assessTopicCoverage", () => {
  it("marks all topics uncovered for empty builder", () => {
    const coverage = assessTopicCoverage(makeBuilder());
    for (const field of PROFILE_FIELD_ORDER) {
      expect(coverage[field].covered).toBe(false);
      expect(coverage[field].depth).toBe(0);
    }
  });

  it("marks topics as covered when profile has content", () => {
    const builder = makeBuilder({
      profile: { ...buildEmptyProfile(), background: "Software engineer with 10 years experience." },
    });
    const coverage = assessTopicCoverage(builder);
    expect(coverage.background.covered).toBe(true);
    expect(coverage.background.depth).toBeGreaterThanOrEqual(1);
    expect(coverage.aiRelationship.covered).toBe(false);
  });

  it("assigns higher depth for longer content", () => {
    const short = "Short answer.";
    const long = "A".repeat(250);
    const veryLong = "A".repeat(500);

    const coverageShort = assessTopicCoverage(makeBuilder({ profile: { ...buildEmptyProfile(), background: short } }));
    const coverageLong = assessTopicCoverage(makeBuilder({ profile: { ...buildEmptyProfile(), background: long } }));
    const coverageVeryLong = assessTopicCoverage(makeBuilder({ profile: { ...buildEmptyProfile(), background: veryLong } }));

    expect(coverageShort.background.depth).toBe(1);
    expect(coverageLong.background.depth).toBe(2);
    expect(coverageVeryLong.background.depth).toBe(3);
  });
});

describe("selectNextTopic", () => {
  it("selects highest-weight uncovered topic for empty builder", () => {
    const coverage = assessTopicCoverage(makeBuilder());
    const result = selectNextTopic(coverage, []);
    expect(result.topic).toBeTruthy();
    expect(result.action).toBe("introduce");
    expect(PROFILE_FIELD_ORDER).toContain(result.topic);
  });

  it("deepens on long answer", () => {
    const builder = makeBuilder({
      profile: { ...buildEmptyProfile(), background: "Software engineer" },
    });
    const coverage = assessTopicCoverage(builder);
    const history = [
      { role: "assistant", text: "Tell me about your background and career." },
      { role: "user", text: "A".repeat(250) },
    ];
    const result = selectNextTopic(coverage, history, builder);
    expect(result.topic).toBeTruthy();
  });

  it("moves on after short answer", () => {
    const builder = makeBuilder({
      profile: { ...buildEmptyProfile(), background: "Engineer" },
    });
    const coverage = assessTopicCoverage(builder);
    const history = [
      { role: "assistant", text: "Tell me about your background." },
      { role: "user", text: "Short." },
    ];
    const result = selectNextTopic(coverage, history, builder);
    expect(result.topic).toBeTruthy();
  });

  it("transitions to builds when all covered at max depth", () => {
    const profile = {};
    for (const field of PROFILE_FIELD_ORDER) {
      profile[field] = "A".repeat(500);
    }
    const builder = makeBuilder({ profile });
    const coverage = assessTopicCoverage(builder);
    const result = selectNextTopic(coverage, []);
    expect(result.action).toBe("transition-to-builds");
  });
});

describe("generateQuestion", () => {
  it("returns primary question at depth 0", () => {
    const q = generateQuestion("background", 0, makeBuilder());
    expect(q).toContain("background");
  });

  it("returns follow-up at depth > 0", () => {
    const q0 = generateQuestion("background", 0, makeBuilder());
    const q1 = generateQuestion("background", 1, makeBuilder());
    expect(q1).not.toBe(q0);
  });

  it("adapts to tool stack context", () => {
    const builder = makeBuilder({ toolStack: { regular: ["Claude", "Python"], familiar: [] } });
    const q = generateQuestion("aiRelationship", 0, builder);
    expect(q).toContain("Claude");
  });

  it("adapts to github context", () => {
    const builder = makeBuilder({ github: { profileUrl: "https://github.com/test", repoUrls: [] } });
    const q = generateQuestion("currentFocus", 0, builder);
    expect(q).toContain("GitHub");
  });

  it("returns transition message for null topic", () => {
    const q = generateQuestion(null, 0, makeBuilder());
    expect(q).toContain("build");
  });
});

describe("extractProfileUpdates", () => {
  it("returns empty for null topic", () => {
    expect(extractProfileUpdates(null, "text", makeBuilder())).toEqual({});
  });

  it("returns empty for empty text", () => {
    expect(extractProfileUpdates("background", "", makeBuilder())).toEqual({});
  });

  it("sets field for first-time answer", () => {
    const result = extractProfileUpdates("background", "I'm a software engineer.", makeBuilder());
    expect(result.background).toBe("I'm a software engineer.");
  });

  it("enriches existing content", () => {
    const builder = makeBuilder({
      profile: { ...buildEmptyProfile(), background: "Software engineer." },
    });
    const result = extractProfileUpdates("background", "Focused on AI.", builder);
    expect(result.background).toContain("Software engineer.");
    expect(result.background).toContain("Focused on AI.");
  });

  it("truncates very long values", () => {
    const result = extractProfileUpdates("background", "A".repeat(600), makeBuilder());
    expect(result.background.length).toBeLessThanOrEqual(263);
  });
});

describe("shouldTransitionToBuilds", () => {
  it("returns false for empty coverage", () => {
    const coverage = assessTopicCoverage(makeBuilder());
    expect(shouldTransitionToBuilds(coverage, makeBuilder())).toBe(false);
  });

  it("returns true when 4+ topics covered at min depth", () => {
    const profile = {
      ...buildEmptyProfile(),
      background: "Engineer",
      aiRelationship: "Technical",
      currentFocus: "Agents",
      notableBuild: "My agent system",
    };
    const builder = makeBuilder({ profile });
    const coverage = assessTopicCoverage(builder);
    expect(shouldTransitionToBuilds(coverage, builder)).toBe(true);
  });

  it("returns true when all topics covered", () => {
    const profile = {};
    for (const field of PROFILE_FIELD_ORDER) {
      profile[field] = "Filled.";
    }
    const builder = makeBuilder({ profile });
    const coverage = assessTopicCoverage(builder);
    expect(shouldTransitionToBuilds(coverage, builder)).toBe(true);
  });
});

describe("buildEngineContext", () => {
  it("returns complete context object", () => {
    const ctx = buildEngineContext(makeBuilder());
    expect(ctx.coverage).toBeTruthy();
    expect(ctx.suggestedQuestion).toBeTruthy();
    expect(typeof ctx.transitionReady).toBe("boolean");
    expect(ctx.suggestedTopic).toBeTruthy();
  });
});
