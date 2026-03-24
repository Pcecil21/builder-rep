const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
export const DEFAULT_ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

export async function callAnthropic({ instructions, schemaName, schema, input }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return null;
  }

  const systemPrompt = [
    instructions,
    "",
    `You must respond with ONLY valid JSON matching this schema (${schemaName}):`,
    JSON.stringify(schema),
    "",
    "Do not include any text before or after the JSON. Do not wrap it in markdown code fences.",
  ].join("\n");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: input,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic request failed: ${response.status} ${detail}`);
  }

  const payload = await response.json();
  const text = payload.content?.[0]?.text ?? "";

  try {
    return JSON.parse(text);
  } catch {
    // If Claude wrapped it in code fences, try to extract JSON
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
}
