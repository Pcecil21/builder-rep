const projectMatchTerms = {
  "camp-claw": ["camp claw", "campclaw", "camp", "onramp"],
  "aidb-new-year": ["new year", "aidb new year", "aodb", "interactive"],
  "sponsor-dashboard": ["sponsor", "dashboard", "reporting", "metrics"],
  holmes: ["holmes", "discovery", "opportunity"],
  mycroft: ["mycroft", "strategy", "roadmap"],
  "openclaw-team": ["openclaw", "10-agent", "10 agent", "agent team", "orchestration"],
  "mission-control": ["mission control", "control", "ops", "oversight"],
};

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function findProject(builder, text) {
  const lower = text.toLowerCase();

  for (const project of builder.projects) {
    const terms = projectMatchTerms[project.id] ?? [project.title.toLowerCase()];
    if (terms.some((term) => lower.includes(term))) {
      return project;
    }
  }

  return null;
}

function getFeaturedProjects(builder) {
  return builder.projects.filter((project) => project.featured);
}

function getProjectsByTag(builder, matcher) {
  return builder.projects.filter((project) =>
    project.tags.some((tag) => matcher.includes(tag)) ||
    matcher.includes(project.category),
  );
}

export function buildInitialMessages(builder) {
  return [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text: builder.featuredIntroLine,
    },
  ];
}

export function buildPromptActions(builder) {
  return uniq([...builder.promptStarts, "Show me the full ecosystem"]);
}

export function buildResponsePlan(builder, userText) {
  const lower = userText.toLowerCase();
  const matchedProject = findProject(builder, userText);

  if (
    lower.includes("ecosystem") ||
    lower.includes("big picture") ||
    lower.includes("overall setup") ||
    lower.includes("full setup") ||
    lower.includes("radar")
  ) {
    return [
      {
        role: "assistant",
        text: "The ecosystem view is the fastest way to see what kind of builder this is and where the work goes deepest.",
      },
      {
        role: "object",
        objectType: "ecosystem",
        data: {},
      },
    ];
  }

  if (
    lower.includes("built") ||
    lower.includes("show me") ||
    lower.includes("portfolio") ||
    lower.includes("projects") ||
    lower.includes("work")
  ) {
    return [
      {
        role: "assistant",
        text: "Projects are the clearest proof here. I'll start with a curated set.",
      },
      {
        role: "object",
        objectType: "showcase",
        data: { projectIds: getFeaturedProjects(builder).map((project) => project.id) },
      },
    ];
  }

  if (
    lower.includes("think") ||
    lower.includes("philosophy") ||
    lower.includes("principle") ||
    lower.includes("optimiz")
  ) {
    return [
      {
        role: "assistant",
        text: "The patterns matter as much as the outputs. Here's the throughline across the work.",
      },
      {
        role: "object",
        objectType: "thinking",
        data: {},
      },
    ];
  }

  if (
    lower.includes("interact") ||
    lower.includes("real thing") ||
    lower.includes("demo") ||
    lower.includes("link")
  ) {
    const target = matchedProject ?? getFeaturedProjects(builder)[0];
    return [
      {
        role: "assistant",
        text: "The product should move you toward real work, not trap you in description.",
      },
      {
        role: "object",
        objectType: "linkout",
        data: { projectId: target.id, link: target.primaryLink },
      },
      {
        role: "assistant",
        text: `If you want context first, I can also walk you through why ${target.title} matters.`,
      },
    ];
  }

  if (
    lower.includes("browse") ||
    lower.includes("about") ||
    lower.includes("overview")
  ) {
    return [
      {
        role: "assistant",
        text: "Use Browse for a quick scan. Chat is better when you want synthesis or a guided path into a project.",
      },
    ];
  }

  if (
    lower.includes("strategy") &&
    !lower.includes("think") &&
    !lower.includes("philosophy")
  ) {
    const projects = getProjectsByTag(builder, ["strategy", "strategy tool"]);
    return [
      {
        role: "assistant",
        text: "These are the strategy-oriented projects I'd surface first.",
      },
      {
        role: "object",
        objectType: "showcase",
        data: { projectIds: projects.map((project) => project.id) },
      },
    ];
  }

  if (
    lower.includes("orchestration") ||
    lower.includes("best orchestration") ||
    lower.includes("multi-agent")
  ) {
    const project =
      builder.projects.find((item) => item.id === "openclaw-team") ?? getFeaturedProjects(builder)[0];
    return [
      {
        role: "assistant",
        text: "This is the clearest orchestration example in the seeded demo content.",
      },
      {
        role: "object",
        objectType: "project-detail",
        data: { projectId: project.id },
      },
      {
        role: "object",
        objectType: "linkout",
        data: { projectId: project.id, link: project.supportingLinks[0] ?? project.primaryLink },
      },
    ];
  }

  if (matchedProject) {
    return [
      {
        role: "assistant",
        text: `Here's the strongest quick read on ${matchedProject.title}.`,
      },
      {
        role: "object",
        objectType: "project-detail",
        data: { projectId: matchedProject.id },
      },
      {
        role: "assistant",
        text: "If you want, I can also connect this project back to the builder's broader approach.",
      },
    ];
  }

  return [
    {
      role: "assistant",
      text: "I can do three useful things from here: show projects, explain how the builder thinks, or move you into a real artifact.",
    },
    {
      role: "object",
      objectType: "showcase",
      data: { projectIds: getFeaturedProjects(builder).map((project) => project.id) },
    },
  ];
}
