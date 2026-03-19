const OPENAI_API_URL = "https://api.openai.com/v1/responses";
export const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.4";

export function parseOutputText(payload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  const textBlock = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text");

  return textBlock?.text ?? "";
}

export async function callOpenAI({ instructions, input, schemaName, schema }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      instructions,
      input,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${detail}`);
  }

  const payload = await response.json();
  const outputText = parseOutputText(payload);

  return JSON.parse(outputText);
}
