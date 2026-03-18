export const BUILDER_SCHEMA_VERSION = 3;

export const TOOL_OPTIONS = [
  "Claude",
  "ChatGPT",
  "Cursor",
  "Lovable",
  "Bolt",
  "Replit",
  "n8n",
  "Make",
  "Zapier",
  "LangChain",
  "CrewAI",
  "OpenAI API",
  "Vercel AI SDK",
  "Supabase",
  "Firebase",
  "Python",
  "TypeScript",
];

export const PROFILE_FIELD_ORDER = [
  "background",
  "aiRelationship",
  "currentFocus",
  "notableBuild",
  "idealWork",
  "builderPhilosophy",
  "originStory",
];

export const PROFILE_FIELD_LABELS = {
  background: "Background",
  aiRelationship: "Relationship to AI",
  currentFocus: "Current Focus",
  notableBuild: "Most Interesting Build",
  idealWork: "Ideal Work",
  builderPhilosophy: "Builder Philosophy",
  originStory: "Origin Story",
};

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value, allowedValues = null) {
  if (!Array.isArray(value)) {
    return [];
  }

  const items = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!allowedValues) {
    return [...new Set(items)];
  }

  const allowed = new Set(allowedValues);
  return [...new Set(items.filter((item) => allowed.has(item)))];
}

function lowerFirst(value) {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function sentence(value) {
  const trimmed = toTrimmedString(value);

  if (!trimmed) {
    return "";
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function joinList(values, maxItems = 3) {
  const picked = values.filter(Boolean).slice(0, maxItems);

  if (!picked.length) {
    return "";
  }

  if (picked.length === 1) {
    return picked[0];
  }

  if (picked.length === 2) {
    return `${picked[0]} and ${picked[1]}`;
  }

  return `${picked.slice(0, -1).join(", ")}, and ${picked[picked.length - 1]}`;
}

function collectSourceText(builder) {
  return [
    builder.profile.background,
    builder.profile.aiRelationship,
    builder.profile.currentFocus,
    builder.profile.notableBuild,
    builder.profile.idealWork,
    builder.profile.builderPhilosophy,
    builder.profile.originStory,
    builder.projects.map((project) => project.title).join(" "),
    builder.projects.map((project) => project.shortDescription).join(" "),
    builder.projects.flatMap((project) => project.focusAreas ?? []).join(" "),
    builder.toolStack.regular.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

export function buildEmptyProfile() {
  return {
    background: "",
    aiRelationship: "",
    currentFocus: "",
    notableBuild: "",
    idealWork: "",
    builderPhilosophy: "",
    originStory: "",
  };
}

export function buildEmptyToolStack() {
  return {
    regular: [],
    familiar: [],
  };
}

export function buildEmptyGithub() {
  return {
    profileUrl: "",
    repoUrls: [],
  };
}

export function buildEmptyOnboarding() {
  return {
    currentStep: "basics",
    interviewResponses: 0,
    skippedToProjects: false,
    studioReady: false,
  };
}

export function normalizeProfile(value) {
  const raw = value && typeof value === "object" ? value : {};

  return {
    background: toTrimmedString(raw.background),
    aiRelationship: toTrimmedString(raw.aiRelationship),
    currentFocus: toTrimmedString(raw.currentFocus),
    notableBuild: toTrimmedString(raw.notableBuild),
    idealWork: toTrimmedString(raw.idealWork),
    builderPhilosophy: toTrimmedString(raw.builderPhilosophy),
    originStory: toTrimmedString(raw.originStory),
  };
}

export function normalizeToolStack(value) {
  const raw = value && typeof value === "object" ? value : {};

  return {
    regular: asStringArray(raw.regular, TOOL_OPTIONS),
    familiar: asStringArray(raw.familiar, TOOL_OPTIONS).filter((tool) => !raw.regular?.includes?.(tool)),
  };
}

export function normalizeGithub(value) {
  const raw = value && typeof value === "object" ? value : {};

  return {
    profileUrl: toTrimmedString(raw.profileUrl),
    repoUrls: asStringArray(raw.repoUrls),
  };
}

export function normalizeOnboarding(value) {
  const raw = value && typeof value === "object" ? value : {};

  return {
    currentStep: ["basics", "interview", "projects", "enrich"].includes(raw.currentStep)
      ? raw.currentStep
      : "basics",
    interviewResponses:
      typeof raw.interviewResponses === "number" && Number.isFinite(raw.interviewResponses)
        ? Math.max(0, Math.floor(raw.interviewResponses))
        : 0,
    skippedToProjects: Boolean(raw.skippedToProjects),
    studioReady: Boolean(raw.studioReady),
  };
}

export function countAnsweredProfileFields(profile) {
  const normalized = normalizeProfile(profile);
  return PROFILE_FIELD_ORDER.filter((field) => normalized[field]).length;
}

export function isBasicsComplete(builder) {
  return Boolean(
    builder.toolStack.regular.length ||
      builder.toolStack.familiar.length ||
      builder.github.profileUrl ||
      builder.github.repoUrls.length,
  );
}

export function projectHasInterviewSignal(project) {
  if (!project || typeof project !== "object") {
    return false;
  }

  const shortDescription = toTrimmedString(project.shortDescription);
  const longDescription = toTrimmedString(project.longDescription);
  const knowledge = toTrimmedString(project.whatChuckieKnows);
  const githubRepoUrl = toTrimmedString(project.githubRepoUrl);
  const primaryLinkUrl = toTrimmedString(project.primaryLink?.url);
  const buildProfileType = toTrimmedString(project.buildProfileType || project.buildType);
  const focusAreas = Array.isArray(project.focusAreas) ? project.focusAreas : [];
  const capabilities = Array.isArray(project.capabilities) ? project.capabilities : [];
  const title = toTrimmedString(project.title).toLowerCase();
  const hasMeaningfulTitle = Boolean(title && title !== "new build" && !/^project \d+$/.test(title));

  return Boolean(
    knowledge ||
      githubRepoUrl ||
      primaryLinkUrl ||
      focusAreas.length ||
      capabilities.length ||
      buildProfileType ||
      (shortDescription && shortDescription !== "Project summary coming soon.") ||
      (longDescription && !longDescription.includes("still being drafted in Builder Studio")) ||
      hasMeaningfulTitle,
  );
}

export function hasInterviewSignal(builder) {
  return Boolean(
    countAnsweredProfileFields(builder.profile) > 0 ||
      builder.toolStack.regular.length ||
      builder.toolStack.familiar.length ||
      builder.github.profileUrl ||
      builder.github.repoUrls.length ||
      builder.projects.some((project) => projectHasInterviewSignal(project)),
  );
}

export function isInterviewStarted(builder) {
  return countAnsweredProfileFields(builder.profile) > 0 || builder.onboarding.interviewResponses > 0;
}

export function canEnterStudio(builder) {
  return Boolean(
    isBasicsComplete(builder) && (isInterviewStarted(builder) || builder.onboarding.skippedToProjects),
  );
}

export function isStudioReady(builder) {
  return Boolean(builder.onboarding.studioReady);
}

export function getNextInterviewField(builder) {
  return (
    PROFILE_FIELD_ORDER.find((field) => !toTrimmedString(builder.profile[field])) ??
    PROFILE_FIELD_ORDER[PROFILE_FIELD_ORDER.length - 1]
  );
}

export function buildInterviewQuestion(field, builder) {
  const tools = joinList(builder.toolStack.regular, 3);
  const hasGithub = Boolean(builder.github.profileUrl);

  if (field === "background") {
    return "Before AI became central to your work, what was your background and what kind of work shaped you?";
  }

  if (field === "aiRelationship") {
    if (tools) {
      return `I can already see ${tools} in your tool stack. Do you think of yourself as technical, non-technical, or something in between when you build with AI?`;
    }

    return "When you build with AI, do you see yourself as technical, non-technical, or hybrid?";
  }

  if (field === "currentFocus") {
    if (hasGithub) {
      return "You added a GitHub presence, which helps. What are you actively building right now, and where is most of your energy going?";
    }

    return "What are you building right now, and where is most of your energy going?";
  }

  if (field === "notableBuild") {
    return "What is the most interesting thing you've built with AI so far, and why does it stand out to you?";
  }

  if (field === "idealWork") {
    return "What kind of work, clients, or opportunities do you want to be known for from here?";
  }

  if (field === "builderPhilosophy") {
    return "When you build, what is your philosophy? What do you optimize for, and what do you avoid?";
  }

  return "How did you get into AI building in the first place? Was there a turning point or a story behind it?";
}

export function buildKnowledgeGapPrompts(builder) {
  const prompts = [];

  PROFILE_FIELD_ORDER.forEach((field) => {
    if (!builder.profile[field]) {
      prompts.push({
        id: `profile:${field}`,
        target: "profile",
        focusField: field,
        label: PROFILE_FIELD_LABELS[field],
        prompt: buildInterviewQuestion(field, builder),
      });
    }
  });

  builder.projects.forEach((project) => {
    if (!project.whatChuckieKnows) {
      prompts.push({
        id: `project:${project.id}`,
        target: "build",
        projectId: project.id,
        label: project.title || "Untitled Build",
        prompt: `You added ${project.title || "this build"}, but I still don't know what makes it interesting. What should I understand about it?`,
      });
    }
  });

  if (!prompts.length) {
    prompts.push({
      id: "profile:general",
      target: "profile",
      focusField: getNextInterviewField(builder),
      label: "Keep Going",
      prompt: "What have you learned recently about how you build, and what should I understand better now?",
    });
  }

  return prompts.slice(0, 6);
}

export function buildInterviewRecap(builder) {
  const profile = normalizeProfile(builder.profile);
  const tools = normalizeToolStack(builder.toolStack).regular;
  const meaningfulProjects = builder.projects.filter((project) => projectHasInterviewSignal(project));
  const bullets = [
    profile.currentFocus ? `${builder.displayName} is focused on ${lowerFirst(sentence(profile.currentFocus)).replace(/[.]$/, "")}.` : "",
    profile.aiRelationship
      ? `${builder.displayName} thinks of their AI-building style as ${lowerFirst(sentence(profile.aiRelationship)).replace(/[.]$/, "")}.`
      : "",
    profile.background ? `Background anchor: ${sentence(profile.background)}` : "",
    profile.notableBuild ? `Most interesting build so far: ${sentence(profile.notableBuild)}` : "",
    profile.builderPhilosophy ? `Builder philosophy: ${sentence(profile.builderPhilosophy)}` : "",
    tools.length ? `Current stack includes ${joinList(tools, 5)}.` : "",
    builder.github.profileUrl ? `GitHub anchor: ${builder.github.profileUrl}.` : "",
    meaningfulProjects.length
      ? `${meaningfulProjects.length} ${meaningfulProjects.length === 1 ? "build" : "builds"} already captured in the studio.`
      : "",
  ].filter(Boolean);

  return {
    headline: bullets.length ? "What I think I know so far" : "Chuckie is just getting started",
    bullets: bullets.slice(0, 6),
  };
}

export function buildReturningInterviewQuestion(builder) {
  const hasProfileSignal = countAnsweredProfileFields(builder.profile) > 0;
  const hasToolingSignal =
    builder.toolStack.regular.length ||
    builder.toolStack.familiar.length ||
    builder.github.profileUrl ||
    builder.github.repoUrls.length;
  const hasProjectSignal = builder.projects.some((project) => projectHasInterviewSignal(project));

  if (builder.profile.currentFocus) {
    return "A lot may have changed since we last went deep. What's top of mind for you right now?";
  }

  if (hasProfileSignal || hasToolingSignal || hasProjectSignal) {
    return "I already have a rough picture of your work. What feels most out of date or incomplete in that picture?";
  }

  return buildInterviewQuestion(getNextInterviewField(builder), builder);
}

export function buildProjectInterviewQuestion(builder, activeProject = null) {
  if (projectHasInterviewSignal(activeProject) && activeProject?.title) {
    return `Let's start with ${activeProject.title}. What should someone understand about it right away?`;
  }

  const firstMeaningfulProject = builder.projects.find((project) => projectHasInterviewSignal(project));

  if (firstMeaningfulProject?.title) {
    return `Let's start with ${firstMeaningfulProject.title}, unless there's a different build you want me to begin with. What does it do, and why does it matter?`;
  }

  return "Let's start with a build. Tell me about the first project I should understand: what it is, what it does, and why it matters.";
}

export function deriveBuilderPresentation(builder) {
  const profile = normalizeProfile(builder.profile);
  const regularTools = normalizeToolStack(builder.toolStack).regular;
  const sourceText = collectSourceText({ ...builder, profile, toolStack: normalizeToolStack(builder.toolStack) });

  const shortBio = profile.currentFocus
    ? `${builder.displayName} is currently focused on ${lowerFirst(sentence(profile.currentFocus)).replace(/[.]$/, "")}.`
    : profile.aiRelationship
      ? `${builder.displayName} is a ${lowerFirst(sentence(profile.aiRelationship)).replace(/[.]$/, "")} builder working with AI systems.`
      : regularTools.length
        ? `${builder.displayName} regularly builds with ${joinList(regularTools)}.`
        : builder.shortBio;

  const featuredIntroLine = profile.currentFocus
    ? `I'm Chuckie. ${builder.displayName} is focused on ${lowerFirst(sentence(profile.currentFocus)).replace(/[.]$/, "")}, and I'll help you understand where the work goes deepest.`
    : profile.aiRelationship
      ? `I'm Chuckie. ${builder.displayName} is a ${lowerFirst(sentence(profile.aiRelationship)).replace(/[.]$/, "")} builder, and I'll walk you through the work.`
      : builder.featuredIntroLine;

  const longerIntro = [
    sentence(profile.background),
    sentence(profile.currentFocus),
    sentence(profile.idealWork),
    sentence(profile.builderPhilosophy),
  ]
    .filter(Boolean)
    .join(" ");

  const themes = [
    sourceText.includes("agent") ? "Agent systems" : "",
    sourceText.includes("workflow") || sourceText.includes("automation") ? "Workflow systems" : "",
    sourceText.includes("orchestrat") ? "Orchestration" : "",
    sourceText.includes("product") || sourceText.includes("app") ? "AI-native product design" : "",
    sourceText.includes("strategy") ? "Strategy" : "",
    sourceText.includes("research") ? "Research" : "",
  ].filter(Boolean);

  const promptStarts = [
    profile.currentFocus
      ? `What is ${builder.displayName} focused on right now?`
      : `What should I understand first about ${builder.displayName}?`,
    profile.notableBuild
      ? `What is the most interesting thing ${builder.displayName} has built?`
      : `What are ${builder.displayName}'s best examples of real work?`,
    profile.idealWork
      ? `What kind of work is ${builder.displayName} best suited for?`
      : `What kind of builder is ${builder.displayName}?`,
    `Show me the full ecosystem for ${builder.displayName}.`,
  ];

  const knowledgeBits = [
    profile.background ? `Background: ${sentence(profile.background)}` : "",
    profile.aiRelationship ? `Relationship to AI: ${sentence(profile.aiRelationship)}` : "",
    profile.currentFocus ? `Current focus: ${sentence(profile.currentFocus)}` : "",
    profile.notableBuild ? `Most interesting build: ${sentence(profile.notableBuild)}` : "",
    profile.idealWork ? `Ideal work: ${sentence(profile.idealWork)}` : "",
    profile.builderPhilosophy ? `Builder philosophy: ${sentence(profile.builderPhilosophy)}` : "",
    profile.originStory ? `Origin story: ${sentence(profile.originStory)}` : "",
    regularTools.length ? `Regular tools: ${joinList(regularTools, 5)}.` : "",
    builder.github.profileUrl ? `GitHub profile: ${builder.github.profileUrl}.` : "",
  ].filter(Boolean);

  return {
    shortBio,
    featuredIntroLine,
    longerIntro: longerIntro || builder.longerIntro,
    themes: themes.length ? themes : builder.themes,
    promptStarts,
    whatChuckieKnows: knowledgeBits.join("\n"),
  };
}

export function syncBuilderFromProfile(builder) {
  const normalizedBuilder = {
    ...builder,
    profile: normalizeProfile(builder.profile),
    toolStack: normalizeToolStack(builder.toolStack),
    github: normalizeGithub(builder.github),
    onboarding: normalizeOnboarding(builder.onboarding),
  };
  const hasSignal =
    hasInterviewSignal(normalizedBuilder);

  const onboarding = {
    ...normalizedBuilder.onboarding,
    studioReady: normalizedBuilder.onboarding.studioReady,
  };

  if (!hasSignal) {
    return {
      ...normalizedBuilder,
      onboarding,
    };
  }

  return {
    ...normalizedBuilder,
    ...deriveBuilderPresentation(normalizedBuilder),
    onboarding,
  };
}
