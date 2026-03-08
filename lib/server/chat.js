import { buildResponsePlan } from "@/src/lib/conversation";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.4";
const PROJECT_STATUSES = ["live", "demo", "prototype", "internal", "archived"];
const PROJECT_CATEGORIES = [
  "public app",
  "agent",
  "multi-agent system",
  "automation",
  "internal tool",
  "strategy tool",
  "dashboard",
  "experiment",
];

function compactBuilder(builder) {
  return {
    name: builder.displayName,
    shortBio: builder.shortBio,
    intro: builder.featuredIntroLine,
    themes: builder.themes,
    voiceNotes: builder.voiceNotes,
    promptStarts: builder.promptStarts,
    projects: builder.projects.map((project) => ({
      id: project.id,
      title: project.title,
      category: project.category,
      shortDescription: project.shortDescription,
      whatItIs: project.whatItIs,
      whyItMatters: project.whyItMatters,
      whatItDemonstrates: project.whatItDemonstrates,
      buildType: project.buildType,
      capabilities: project.capabilities,
      featured: project.featured,
      tags: project.tags,
      primaryLink: project.primaryLink?.url ?? "",
    })),
  };
}

function compactHistory(history = []) {
  return history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-8)
    .map((message) => ({
      role: message.role,
      text: message.text,
    }));
}

function parseOutputText(payload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  const textBlock = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text");

  return textBlock?.text ?? "";
}

async function callOpenAI({ instructions, input, schemaName, schema }) {
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

function themeCandidatesFromText(text) {
  const lower = text.toLowerCase();

  return [
    lower.includes("agent") ? "Agent systems" : "",
    lower.includes("orchestrat") ? "Orchestration" : "",
    lower.includes("strategy") ? "Strategy" : "",
    lower.includes("product") ? "AI-native product design" : "",
    lower.includes("automation") ? "Automation" : "",
    lower.includes("workflow") ? "Workflow systems" : "",
  ].filter(Boolean);
}

function inferCategory(input) {
  const lower = input.toLowerCase();
  if (lower.includes("dashboard") || lower.includes("report")) return "dashboard";
  if (lower.includes("strategy")) return "strategy tool";
  if (lower.includes("agent")) return "agent";
  if (lower.includes("team") || lower.includes("orchestration") || lower.includes("multi")) {
    return "multi-agent system";
  }
  if (lower.includes("internal")) return "internal tool";
  if (lower.includes("automation")) return "automation";
  if (lower.includes("public") || lower.includes("site") || lower.includes("app")) return "public app";
  return "experiment";
}

function titleFromInput(input) {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed.split(/\s+/).find((token) => token.startsWith("http")) ?? trimmed);
    return url.hostname
      .replace(/^www\./, "")
      .split(".")[0]
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  } catch {
    return (
      trimmed
        .split(/[.!?]/)[0]
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase()) || "New Project"
    );
  }
}

function inferProjectDraft(input) {
  const title = titleFromInput(input);
  const category = inferCategory(input);
  const primaryLinkUrl =
    input
      .trim()
      .split(/\s+/)
      .find((token) => token.startsWith("http")) ?? "";

  return {
    title,
    category,
    shortDescription: "Project draft inferred from the builder's description.",
    longDescription: `${title} appears to be a ${category}.`,
    problem: "Waiting for builder context.",
    whatItIs: "Drafted from conversation.",
    whyItMatters: "Waiting for the builder's emphasis.",
    whatItDemonstrates: "Waiting for the builder's emphasis.",
    whyBuiltThisWay: "Waiting for design rationale.",
    status: "prototype",
    featured: false,
    tags: [category],
    primaryLinkUrl,
  };
}

function fallbackViewer(builder, userText) {
  const plan = buildResponsePlan(builder, userText);
  const firstAssistant = plan.find((entry) => entry.role === "assistant")?.text;
  const object = plan.find((entry) => entry.role === "object");

  return {
    reply: firstAssistant ?? "I can show projects, explain the thinking, or send you into something real.",
    intent:
      object?.objectType === "showcase"
            ? "showcase"
            : object?.objectType === "project-detail"
              ? "project-detail"
              : object?.objectType === "thinking"
                ? "thinking"
                : object?.objectType === "ecosystem"
                  ? "ecosystem"
                : object?.objectType === "linkout"
                  ? "linkout"
                  : "none",
    projectIds: object?.data?.projectIds ?? (object?.data?.projectId ? [object.data.projectId] : []),
  };
}

function fallbackStudio({ builder, userText, stage, history }) {
  if (stage === "discovery") {
    const builderTurns = history.filter((message) => message.role === "user").length + 1;

    return {
      reply:
        builderTurns >= 2
          ? `I think I understand the shape of ${builder.displayName} now. Let's go project by project next.`
          : `That helps. When someone first meets ${builder.displayName}, what should Chuckie lead with?`,
      introDraft: `I'm Chuckie. ${builder.displayName} builds systems that become clearer the moment you see the work itself.`,
      themes: themeCandidatesFromText(userText),
      promptStarts: [
        `What should I understand first about ${builder.displayName}?`,
        `What are ${builder.displayName}'s best examples of real work?`,
      ],
      readyForProjects: builderTurns >= 2,
    };
  }

  const draft = inferProjectDraft(userText);

  return {
    reply: `I drafted ${draft.title}. What is it, why did you build it, and what should someone understand about it right away?`,
    captureStatus: "needs-more-context",
    projectDraft: draft,
  };
}

function buildViewerInstructions(builder) {
  const projectIds = builder.projects.map((project) => project.id).join(", ");

  return [
    "You are Chuckie, a premium conversational representative for a builder's work.",
    "Be direct, warm, and editorial. Avoid hype, recruiter language, and generic AI boilerplate.",
    "Prefer showing real work over abstract explanation.",
    "Return concise natural language in the reply field.",
    "Choose the best intent for the user's message.",
    "If the user asks for the big picture, overall setup, full ecosystem, or radar view, choose ecosystem.",
    "Use only these project ids if you reference projects:",
    projectIds,
  ].join("\n");
}

function buildStudioInstructions(stage, builder) {
  return [
    "You are Chuckie helping a builder teach you about their work.",
    "Sound sharp, calm, and collaborative.",
    "Ask only the next useful question. Do not explain the workflow or talk like a product tutorial.",
    stage === "discovery"
      ? "You are in the discovery interview. Infer framing, themes, and prompt starts."
      : "You are in project capture. Infer a strong draft project record from the builder's input, then ask only the next necessary question.",
    `The builder is ${builder.displayName}.`,
  ].join("\n");
}

async function handleViewer(payload) {
  const { builder, history, userText } = payload;
  const projectIds = builder.projects.map((project) => project.id);

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      reply: { type: "string" },
      intent: {
        type: "string",
        enum: ["none", "showcase", "project-detail", "thinking", "ecosystem", "linkout"],
      },
      projectIds: {
        type: "array",
        items: { type: "string", enum: projectIds },
        maxItems: 3,
      },
    },
    required: ["reply", "intent", "projectIds"],
  };

  try {
    const response = await callOpenAI({
      instructions: buildViewerInstructions(builder),
      schemaName: "builder_rep_viewer_reply",
      schema,
      input: JSON.stringify({
        builder: compactBuilder(builder),
        history: compactHistory(history),
        userMessage: userText,
      }),
    });

    return response ?? fallbackViewer(builder, userText);
  } catch {
    return fallbackViewer(builder, userText);
  }
}

async function handleStudio(payload) {
  const { builder, history, userText, stage, currentProject } = payload;

  const discoverySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      reply: { type: "string" },
      introDraft: { type: "string" },
      themes: {
        type: "array",
        items: { type: "string" },
        maxItems: 5,
      },
      promptStarts: {
        type: "array",
        items: { type: "string" },
        maxItems: 5,
      },
      readyForProjects: { type: "boolean" },
    },
    required: ["reply", "introDraft", "themes", "promptStarts", "readyForProjects"],
  };

  const projectSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      reply: { type: "string" },
      captureStatus: {
        type: "string",
        enum: ["needs-more-context", "project-captured"],
      },
      projectDraft: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          category: { type: "string", enum: PROJECT_CATEGORIES },
          shortDescription: { type: "string" },
          longDescription: { type: "string" },
          problem: { type: "string" },
          whatItIs: { type: "string" },
          whyItMatters: { type: "string" },
          whatItDemonstrates: { type: "string" },
          whyBuiltThisWay: { type: "string" },
          status: { type: "string", enum: PROJECT_STATUSES },
          featured: { type: "boolean" },
          tags: {
            type: "array",
            items: { type: "string" },
            maxItems: 6,
          },
          primaryLinkUrl: { type: "string" },
        },
        required: [
          "title",
          "category",
          "shortDescription",
          "longDescription",
          "problem",
          "whatItIs",
          "whyItMatters",
          "whatItDemonstrates",
          "whyBuiltThisWay",
          "status",
          "featured",
          "tags",
          "primaryLinkUrl",
        ],
      },
    },
    required: ["reply", "captureStatus", "projectDraft"],
  };

  try {
    const response = await callOpenAI({
      instructions: buildStudioInstructions(stage, builder),
      schemaName:
        stage === "discovery" ? "builder_rep_discovery_reply" : "builder_rep_project_reply",
      schema: stage === "discovery" ? discoverySchema : projectSchema,
      input: JSON.stringify({
        builder: compactBuilder(builder),
        history: compactHistory(history),
        currentProject:
          currentProject && stage === "projects"
            ? {
                id: currentProject.id,
                title: currentProject.title,
                category: currentProject.category,
                shortDescription: currentProject.shortDescription,
                problem: currentProject.problem,
                whatItIs: currentProject.whatItIs,
                whyItMatters: currentProject.whyItMatters,
                whatItDemonstrates: currentProject.whatItDemonstrates,
                whyBuiltThisWay: currentProject.whyBuiltThisWay,
                primaryLinkUrl: currentProject.primaryLink?.url ?? "",
              }
            : null,
        userMessage: userText,
      }),
    });

    return response ?? fallbackStudio({ builder, userText, stage, history });
  } catch {
    return fallbackStudio({ builder, userText, stage, history });
  }
}

export async function handleChatPayload(payload) {
  if (payload.surface === "viewer") {
    return handleViewer(payload);
  }

  if (payload.surface === "studio") {
    return handleStudio(payload);
  }

  return {
    reply: "Unsupported surface.",
    intent: "none",
    projectIds: [],
  };
}
