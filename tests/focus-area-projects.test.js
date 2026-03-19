import { describe, expect, it } from "vitest";
import { getFocusAreaProjects } from "@/lib/build-taxonomy";

function makeBuilder(projects = []) {
  return { projects };
}

describe("getFocusAreaProjects", () => {
  it("returns empty object for no projects", () => {
    expect(getFocusAreaProjects(makeBuilder())).toEqual({});
  });

  it("returns empty for projects with no focus areas", () => {
    const result = getFocusAreaProjects(makeBuilder([
      { id: "p1", title: "Test", shortDescription: "A project", focusAreas: [] },
    ]));
    expect(Object.keys(result).length).toBe(0);
  });

  it("groups projects by focus area", () => {
    const result = getFocusAreaProjects(makeBuilder([
      { id: "p1", title: "Agent A", shortDescription: "First", focusAreas: ["research", "coding-dev"] },
      { id: "p2", title: "Agent B", shortDescription: "Second", focusAreas: ["research"] },
    ]));
    expect(result["research"].length).toBe(2);
    expect(result["coding-dev"].length).toBe(1);
    expect(result["research"][0].id).toBe("p1");
    expect(result["research"][1].id).toBe("p2");
  });

  it("ignores invalid focus areas", () => {
    const result = getFocusAreaProjects(makeBuilder([
      { id: "p1", title: "Test", shortDescription: "A project", focusAreas: ["research", "invalid-area"] },
    ]));
    expect(result["research"].length).toBe(1);
    expect(result["invalid-area"]).toBeUndefined();
  });

  it("includes project metadata in result", () => {
    const result = getFocusAreaProjects(makeBuilder([
      { id: "p1", title: "My Agent", shortDescription: "Does cool things", focusAreas: ["design"] },
    ]));
    expect(result["design"][0]).toEqual({
      id: "p1",
      title: "My Agent",
      shortDescription: "Does cool things",
    });
  });
});
