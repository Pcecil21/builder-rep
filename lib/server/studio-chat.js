import {
  buildInterviewQuestion,
  buildKnowledgeGapPrompts,
  getNextInterviewField,
  PROFILE_FIELD_ORDER,
} from "@/lib/builder-profile";
import { buildEngineContext } from "@/lib/server/interview-engine";
import { callOpenAI } from "@/lib/server/openai-client";

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

export function compactBuilder(builder) {
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

function summarizeFieldValue(userText) {
  const trimmed = userText.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.length <= 260) {
    return trimmed;
  }

  return `${trimmed.slice(0, 257).trimEnd()}...`;
}

function buildInterviewResponse({ builder, userText, focusField }) {
  const nextField = PROFILE_FIELD_ORDER.find((field) =>
    field === focusField ? false : !builder.profile?.[field],
  );
  const replyPrefix =
    focusField === "aiRelationship"
      ? "That helps me place how you actually operate as a builder."
      : focusField === "currentFocus"
        ? "That gives me a clearer read on where your energy is going right now."
        : focusField === "builderPhilosophy"
          ? "That gives me a much better sense of your judgment."
          : "That adds useful signal.";

  return {
    reply: nextField
      ? `${replyPrefix} ${buildInterviewQuestion(nextField, builder)}`
      : `${replyPrefix} I have enough to start representing you with real substance, and we can keep deepening this anytime.`,
    profileField: focusField,
    fieldValue: summarizeFieldValue(userText),
    nextFocusField: nextField ?? focusField,
    nextQuestion: nextField ? buildInterviewQuestion(nextField, builder) : "",
    readyForProjects: true,
  };
}

export function fallbackStudio({ builder, userText, stage, history, focusField, currentProject }) {
  if (stage === "onboarding-interview") {
    const targetField = PROFILE_FIELD_ORDER.includes(focusField) ? focusField : getNextInterviewField(builder);
    return buildInterviewResponse({
      builder,
      userText,
      focusField: targetField,
    });
  }

  if (stage === "profile-refine") {
    return {
      reply: "That helps. I have a sharper read on how to talk about you now. What feels most important to update next?",
      knowledgeNote: userText,
    };
  }

  if (stage === "build-refine") {
    return {
      reply: currentProject?.title
        ? `That helps. I have a clearer read on ${currentProject.title} now. What should someone understand about it immediately?`
        : "That helps. I have a clearer read on this build now. What should someone understand about it immediately?",
      knowledgeNote: userText,
    };
  }

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

function buildStudioInstructions(stage, builder, focusField, engineContext) {
  const lines = [
    "You are Chuckie helping a builder teach you about their work.",
    "Sound sharp, calm, and collaborative.",
    "Be concise and useful. Do not explain the workflow or talk like a product tutorial.",
  ];

  if (stage === "onboarding-interview") {
    lines.push("You are in the onboarding interview. Reflect back what you learned, summarize the user's answer into the requested profile field, and ask the next best question.");
    if (engineContext) {
      lines.push(`Suggested next question: ${engineContext.suggestedQuestion}`);
      lines.push(`Suggested topic: ${engineContext.suggestedTopic ?? "transition to builds"}`);
      lines.push(`Action: ${engineContext.suggestedAction}`);
      if (engineContext.transitionReady) {
        lines.push("The builder has covered enough ground. Consider transitioning to builds if it feels natural.");
      }
    }
  } else if (stage === "discovery") {
    lines.push("You are in the discovery interview. Infer framing, themes, and prompt starts.");
  } else if (stage === "profile-refine") {
    lines.push("The builder chose My Background. Return a concise knowledgeNote that should be appended to the background What Chuckie Knows field. reply should briefly say what Chuckie now understands.");
  } else if (stage === "build-refine") {
    lines.push("The builder chose My Agents/Projects. Return a concise knowledgeNote that should be appended to the selected build's What Chuckie Knows field. reply should briefly say what Chuckie now understands.");
  } else {
    lines.push("You are in project capture. Infer a strong draft project record from the builder's input, then ask only the next necessary question.");
  }

  lines.push(`The builder is ${builder.displayName}.`);

  if (stage === "onboarding-interview" && focusField) {
    lines.push(`The current interview focus is ${focusField}. Use that field for the summary.`);
  }

  return lines.join("\n");
}

export async function handleStudio(payload) {
  const { builder, history, userText, stage, currentProject, focusField } = payload;

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

  const profileRefineSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      reply: { type: "string" },
      knowledgeNote: { type: "string" },
    },
    required: ["reply", "knowledgeNote"],
  };

  const buildRefineSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      reply: { type: "string" },
      knowledgeNote: { type: "string" },
    },
    required: ["reply", "knowledgeNote"],
  };

  const onboardingInterviewSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      reply: { type: "string" },
      profileField: {
        type: "string",
        enum: PROFILE_FIELD_ORDER,
      },
      fieldValue: { type: "string" },
      nextFocusField: {
        type: "string",
        enum: PROFILE_FIELD_ORDER,
      },
      nextQuestion: { type: "string" },
      readyForProjects: { type: "boolean" },
    },
    required: ["reply", "profileField", "fieldValue", "nextFocusField", "nextQuestion", "readyForProjects"],
  };

  const engineContext = stage === "onboarding-interview" ? buildEngineContext(builder, history) : null;
  const resolvedFocusField = engineContext?.suggestedTopic ?? focusField ?? getNextInterviewField(builder);

  try {
    const response = await callOpenAI({
      instructions: buildStudioInstructions(stage, builder, resolvedFocusField, engineContext),
      schemaName:
        stage === "onboarding-interview"
          ? "builder_rep_onboarding_interview_reply"
          : stage === "discovery"
          ? "builder_rep_discovery_reply"
          : stage === "profile-refine"
            ? "builder_rep_profile_refine_reply"
            : stage === "build-refine"
              ? "builder_rep_build_refine_reply"
              : "builder_rep_project_reply",
      schema:
        stage === "onboarding-interview"
          ? onboardingInterviewSchema
          : stage === "discovery"
          ? discoverySchema
          : stage === "profile-refine"
            ? profileRefineSchema
            : stage === "build-refine"
              ? buildRefineSchema
              : projectSchema,
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
            : currentProject && stage === "build-refine"
              ? {
                  id: currentProject.id,
                  title: currentProject.title,
                  shortDescription: currentProject.shortDescription,
                  longDescription: currentProject.longDescription,
                  whatChuckieKnows: currentProject.whatChuckieKnows,
                  whatItIs: currentProject.whatItIs,
                  whyItMatters: currentProject.whyItMatters,
                  whatItDemonstrates: currentProject.whatItDemonstrates,
                  whyBuiltThisWay: currentProject.whyBuiltThisWay,
                }
            : null,
        userMessage: userText,
        focusField: resolvedFocusField,
        suggestedPrompt:
          stage === "onboarding-interview"
            ? engineContext?.suggestedQuestion ?? buildInterviewQuestion(resolvedFocusField, builder)
            : "",
        activePrompts: buildKnowledgeGapPrompts(builder).map((prompt) => prompt.prompt),
      }),
    });

    return response ?? fallbackStudio({ builder, userText, stage, history, focusField, currentProject });
  } catch {
    return fallbackStudio({ builder, userText, stage, history, focusField, currentProject });
  }
}
