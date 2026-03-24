import { callAnthropic } from "@/lib/server/anthropic-client";

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

async function callOpenAIDirect({ instructions, input, schemaName, schema }) {
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

export async function callOpenAI({ instructions, input, schemaName, schema }) {
  // Try Anthropic first if API key is configured
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await callAnthropic({ instructions, input, schemaName, schema });
      if (result !== null) {
        return result;
      }
    } catch {
      // Fall through to OpenAI
    }
  }

  return callOpenAIDirect({ instructions, input, schemaName, schema });
}
