import { describe, expect, it } from "vitest";
import { normalizeBuilder } from "@/lib/server/builder";

describe("chatHistory normalization", () => {
  it("initializes empty for missing chatHistory", () => {
    const builder = normalizeBuilder({ displayName: "Test" });
    expect(builder.chatHistory).toEqual([]);
  });

  it("preserves valid entries", () => {
    const builder = normalizeBuilder({
      displayName: "Test",
      chatHistory: [
        { role: "assistant", text: "Hello" },
        { role: "user", text: "Hi" },
      ],
    });
    expect(builder.chatHistory.length).toBe(2);
    expect(builder.chatHistory[0].role).toBe("assistant");
    expect(builder.chatHistory[1].text).toBe("Hi");
  });

  it("filters invalid entries", () => {
    const builder = normalizeBuilder({
      displayName: "Test",
      chatHistory: [
        { role: "assistant", text: "Hello" },
        { role: "system", text: "should be filtered" },
        null,
        { role: "user", text: "" },
        { role: "user", text: "Valid" },
        42,
      ],
    });
    expect(builder.chatHistory.length).toBe(2);
    expect(builder.chatHistory[0].text).toBe("Hello");
    expect(builder.chatHistory[1].text).toBe("Valid");
  });

  it("caps at 40 entries", () => {
    const entries = Array.from({ length: 60 }, (_, i) => ({
      role: i % 2 === 0 ? "assistant" : "user",
      text: `Message ${i}`,
    }));
    const builder = normalizeBuilder({ displayName: "Test", chatHistory: entries });
    expect(builder.chatHistory.length).toBe(40);
    expect(builder.chatHistory[0].text).toBe("Message 20");
  });

  it("trims text values", () => {
    const builder = normalizeBuilder({
      displayName: "Test",
      chatHistory: [{ role: "user", text: "  hello  " }],
    });
    expect(builder.chatHistory[0].text).toBe("hello");
  });

  it("preserves recap entries", () => {
    const builder = normalizeBuilder({
      displayName: "Test",
      chatHistory: [
        { role: "assistant", text: "recap text", kind: "recap", recap: { headline: "Test", bullets: [] } },
      ],
    });
    expect(builder.chatHistory[0].kind).toBe("recap");
    expect(builder.chatHistory[0].recap.headline).toBe("Test");
  });
});
