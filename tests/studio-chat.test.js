import { describe, expect, it } from "vitest";
import { fallbackStudio } from "@/lib/server/studio-chat";
import { buildEmptyProfile } from "@/lib/builder-profile";

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

describe("fallbackStudio", () => {
  it("returns interview response for onboarding-interview stage", () => {
    const result = fallbackStudio({
      builder: makeBuilder(),
      userText: "I'm a software engineer.",
      stage: "onboarding-interview",
      history: [],
      focusField: "background",
      currentProject: null,
    });
    expect(result.reply).toBeTruthy();
    expect(result.profileField).toBe("background");
    expect(result.fieldValue).toBe("I'm a software engineer.");
  });

  it("returns knowledgeNote for profile-refine stage", () => {
    const result = fallbackStudio({
      builder: makeBuilder(),
      userText: "I focus on multi-agent systems.",
      stage: "profile-refine",
      history: [],
      focusField: null,
      currentProject: null,
    });
    expect(result.reply).toBeTruthy();
    expect(result.knowledgeNote).toBe("I focus on multi-agent systems.");
  });

  it("returns knowledgeNote for build-refine stage with project title", () => {
    const result = fallbackStudio({
      builder: makeBuilder(),
      userText: "It handles orchestration.",
      stage: "build-refine",
      history: [],
      focusField: null,
      currentProject: { title: "OpenClaw" },
    });
    expect(result.reply).toContain("OpenClaw");
    expect(result.knowledgeNote).toBe("It handles orchestration.");
  });

  it("returns discovery response", () => {
    const result = fallbackStudio({
      builder: makeBuilder(),
      userText: "I build agent systems.",
      stage: "discovery",
      history: [],
      focusField: null,
      currentProject: null,
    });
    expect(result.introDraft).toBeTruthy();
    expect(result.themes).toContain("Agent systems");
    expect(result.readyForProjects).toBe(false);
  });

  it("returns project draft for unknown stage", () => {
    const result = fallbackStudio({
      builder: makeBuilder(),
      userText: "I built an agent dashboard.",
      stage: "projects",
      history: [],
      focusField: null,
      currentProject: null,
    });
    expect(result.projectDraft).toBeTruthy();
    expect(result.projectDraft.title).toBeTruthy();
  });
});
