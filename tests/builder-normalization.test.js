import { describe, expect, it } from "vitest";
import { normalizeBuilder, buildDefaultBuilder } from "@/lib/server/builder";

describe("normalizeBuilder", () => {
  it("produces a valid builder from empty input", () => {
    const builder = normalizeBuilder(null);
    expect(builder.displayName).toBeTruthy();
    expect(builder.profile.background).toBe("");
    expect(builder.toolStack.regular).toEqual([]);
    expect(builder.projects).toEqual([]);
    expect(builder.slug).toBeTruthy();
  });

  it("preserves display name", () => {
    const builder = normalizeBuilder({ displayName: "Alice", name: "Alice" });
    expect(builder.displayName).toBe("Alice");
  });

  it("normalizes projects array", () => {
    const builder = normalizeBuilder({
      displayName: "Bob",
      projects: [
        { title: "My Agent", buildProfileType: "Agent", focusAreas: ["research"] },
        { title: "My App" },
      ],
    });
    expect(builder.projects.length).toBe(2);
    expect(builder.projects[0].buildProfileType).toBe("Agent");
    expect(builder.projects[0].kind).toBe("agent");
    expect(builder.projects[1].kind).toBe("project");
  });

  it("handles garbage projects gracefully", () => {
    const builder = normalizeBuilder({
      displayName: "Test",
      projects: [null, undefined, 42, "string", {}],
    });
    expect(builder.projects.length).toBe(5);
    expect(builder.projects[0].title).toBe("Project 1");
  });

  it("strips legacy placeholder descriptions", () => {
    const builder = normalizeBuilder({
      displayName: "Test",
      projects: [
        {
          title: "Test",
          primaryLink: { description: "Primary link captured during onboarding." },
        },
      ],
    });
    expect(builder.projects[0].primaryLink.description).toBe("");
  });
});

describe("buildDefaultBuilder", () => {
  it("creates builder from email", () => {
    const builder = buildDefaultBuilder({ userId: "u1", email: "alice@example.com" });
    expect(builder.displayName).toBe("Alice");
    expect(builder.slug).toBe("alice");
    expect(builder.profile.background).toBe("");
  });
});
