import { buildResponsePlan } from "@/src/lib/conversation";
import { callOpenAI } from "@/lib/server/openai-client";

function compactBuilder(builder) {
  return {
    name: builder.displayName,
    shortBio: builder.shortBio,
    intro: builder.featuredIntroLine,
    whatChuckieKnows: builder.whatChuckieKnows,
    themes: builder.themes,
    voiceNotes: builder.voiceNotes,
    promptStarts: builder.promptStarts,
    profile: builder.profile,
    toolStack: builder.toolStack,
    github: builder.github,
    projects: builder.projects.map((project) => ({
      id: project.id,
      kind: project.kind,
      primaryType: project.primaryType,
      focusAreas: project.focusAreas,
      title: project.title,
      githubRepoUrl: project.githubRepoUrl,
      category: project.category,
      shortDescription: project.shortDescription,
      longDescription: project.longDescription,
      whatItIs: project.whatItIs,
      whyItMatters: project.whyItMatters,
      whatItDemonstrates: project.whatItDemonstrates,
      whatChuckieKnows: project.whatChuckieKnows,
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

export function fallbackViewer(builder, userText) {
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

export async function handleViewer(payload) {
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
