import { describe, expect, it } from "vitest";
import { fallbackViewer } from "@/lib/server/viewer-chat";
import { buildEmptyProfile } from "@/lib/builder-profile";

function makeBuilder(overrides = {}) {
  return {
    displayName: "Test Builder",
    shortBio: "A test builder.",
    featuredIntroLine: "I'm Chuckie.",
    whatChuckieKnows: "",
    themes: [],
    voiceNotes: [],
    promptStarts: [],
    highlightedThemes: [],
    profile: buildEmptyProfile(),
    toolStack: { regular: [], familiar: [] },
    github: { profileUrl: "", repoUrls: [] },
    projects: [
      {
        id: "test-project",
        title: "Test Project",
        category: "agent",
        tags: ["agent"],
        shortDescription: "A test project.",
        primaryLink: { url: "https://example.com" },
        supportingLinks: [],
      },
    ],
    ...overrides,
  };
}

describe("fallbackViewer", () => {
  it("returns ecosystem intent for ecosystem queries", () => {
    const result = fallbackViewer(makeBuilder(), "show me the ecosystem");
    expect(result.intent).toBe("ecosystem");
  });

  it("returns showcase intent for portfolio queries", () => {
    const result = fallbackViewer(makeBuilder(), "show me your projects");
    expect(result.intent).toBe("showcase");
  });

  it("returns thinking intent for philosophy queries", () => {
    const result = fallbackViewer(makeBuilder(), "what does this builder think about?");
    expect(result.intent).toBe("thinking");
  });

  it("always returns a reply string", () => {
    const result = fallbackViewer(makeBuilder(), "random question");
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });
});
