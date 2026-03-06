import { useMemo, useRef, useState } from "react";
import { requestStudioTurn } from "../lib/api";

const STAGES = [
  { id: "discovery", label: "Discovery Interview" },
  { id: "projects", label: "Project Builder" },
  { id: "review", label: "Review / Case File" },
];

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
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
      .replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return (
      trimmed
        .split(/[.!?]/)[0]
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase()) || "New Project"
    );
  }
}

function inferProjectDraft(input) {
  const title = titleFromInput(input);
  const category = inferCategory(input);
  const lower = input.toLowerCase();
  const primaryUrl =
    input
      .trim()
      .split(/\s+/)
      .find((token) => token.startsWith("http")) ?? "https://example.com";

  return {
    title,
    category,
    shortDescription:
      {
        dashboard: "Reporting surface that turns metrics into a product experience.",
        "strategy tool": "Conversational tool for turning discovery into strategic direction.",
        agent: "Agent product that encodes reasoning into a usable interface.",
        "multi-agent system": "Coordinated multi-agent system with roles, routing, and oversight.",
        "internal tool": "Internal operating layer that supports a broader system.",
        automation: "Automation layer that removes manual operational work.",
        "public app": "Public-facing product built around a specific job or audience.",
        experiment: "Fast experiment that demonstrates a specific capability.",
      }[category] ?? "Project draft",
    longDescription: `${title} appears to be a ${category}. Chuckie drafted this from the builder's link or description.`,
    problem: "Waiting for builder context.",
    whatItIs: "Drafted from conversation.",
    whyItMatters: "Drafted from conversation and awaiting builder emphasis.",
    whatItDemonstrates: "Drafted from conversation and awaiting builder emphasis.",
    whyBuiltThisWay: "Chuckie needs a bit more context to explain the design logic behind it.",
    status: "prototype",
    featured: false,
    tags: uniq([category, lower.includes("agent") ? "agent" : "", lower.includes("ai") ? "ai" : ""]),
    tools: [],
    systems: [],
    primaryLink: {
      type: "website",
      title: `Open ${title}`,
      url: primaryUrl,
      description: "Primary link captured in onboarding.",
    },
    supportingLinks: [],
    visuals: [{ title: "Imported artifact", description: "Chuckie can attach visuals once you add them." }],
    artifacts: [],
  };
}

function themeCandidatesFromText(text) {
  const lower = text.toLowerCase();
  return uniq([
    lower.includes("agent") ? "Agent systems" : "",
    lower.includes("orchestrat") ? "Orchestration" : "",
    lower.includes("strategy") ? "Strategy" : "",
    lower.includes("product") ? "AI-native product design" : "",
    lower.includes("automation") ? "Automation" : "",
    lower.includes("workflow") ? "Workflow systems" : "",
  ]);
}

function discoveryReply(builder, input, count) {
  const lower = input.toLowerCase();

  if (count >= 2) {
    return `I think I understand the shape of ${builder.displayName} now: systems-oriented, product-minded, and strongest when the work can be shown through real examples. Let's go project by project next.`;
  }

  if (lower.includes("agent") || lower.includes("system")) {
    return "What patterns show up across your work, and what should I emphasize more than most people would?";
  }

  return `That helps. When someone first meets ${builder.displayName}, what should Chuckie lead with?`;
}

function projectReply(projectTitle, projectCount) {
  if (projectCount === 1) {
    return `I drafted ${projectTitle}. What is it, why did you build it, and what should someone understand about it right away?`;
  }

  return `Got it. ${projectTitle} is in the case file. Tell me about the next project you want included.`;
}

function buildProjectPayload(draft) {
  const title = draft.title || "New Project";
  const url = draft.primaryLinkUrl || "https://example.com";

  return {
    title,
    category: draft.category || "experiment",
    shortDescription: draft.shortDescription || "Project draft",
    longDescription: draft.longDescription || `${title} drafted from conversation.`,
    problem: draft.problem || "Waiting for builder context.",
    whatItIs: draft.whatItIs || "Drafted from conversation.",
    whyItMatters: draft.whyItMatters || "Waiting for builder emphasis.",
    whatItDemonstrates: draft.whatItDemonstrates || "Waiting for builder emphasis.",
    whyBuiltThisWay: draft.whyBuiltThisWay || "Waiting for design rationale.",
    status: draft.status || "prototype",
    featured: Boolean(draft.featured),
    tags: draft.tags || [],
    tools: [],
    systems: [],
    primaryLink: {
      type: "website",
      title: `Open ${title}`,
      url,
      description: "Primary link captured during onboarding.",
    },
    supportingLinks: [],
    visuals: [{ title: "Imported artifact", description: "Attach screenshots or references later." }],
    artifacts: [],
  };
}

function ManualEditor({ project, onUpdateProjectField, onToggleFeatured }) {
  if (!project) return null;

  return (
    <div className="review-editor">
      <div className="review-section-label">Manual Edit</div>
      <div className="review-form">
        <label>
          Title
          <input
            value={project.title}
            onChange={(event) => onUpdateProjectField(project.id, "title", event.target.value)}
          />
        </label>
        <label>
          Category
          <input
            value={project.category}
            onChange={(event) => onUpdateProjectField(project.id, "category", event.target.value)}
          />
        </label>
        <label className="review-form-wide">
          One-line framing
          <input
            value={project.shortDescription}
            onChange={(event) => onUpdateProjectField(project.id, "shortDescription", event.target.value)}
          />
        </label>
        <label className="review-form-wide">
          Why it matters
          <textarea
            rows="3"
            value={project.whyItMatters}
            onChange={(event) => onUpdateProjectField(project.id, "whyItMatters", event.target.value)}
          />
        </label>
        <label className="review-form-wide">
          Primary link
          <input
            value={project.primaryLink.url}
            onChange={(event) =>
              onUpdateProjectField(project.id, "primaryLink", {
                ...project.primaryLink,
                url: event.target.value,
              })
            }
          />
        </label>
        <label className="review-featured-toggle">
          <input type="checkbox" checked={project.featured} onChange={() => onToggleFeatured(project.id)} />
          Featured project
        </label>
      </div>
    </div>
  );
}

export default function BuilderSetup({
  builder,
  onUpdateBuilderField,
  onUpdateListField,
  onToggleFeatured,
  onCreateProject,
  onUpdateProjectField,
}) {
  const [stage, setStage] = useState("discovery");
  const [input, setInput] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(builder.projects[0]?.id ?? null);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discoveryCount, setDiscoveryCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const inputRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: "chuckie",
      text: "Tell me what kind of builder you are. I want to understand how you think, what ties your work together, and what I should lead with.",
    },
  ]);

  const selectedProject =
    builder.projects.find((project) => project.id === selectedProjectId) ?? builder.projects[0] ?? null;

  const featuredProjects = useMemo(
    () => builder.projects.filter((project) => project.featured),
    [builder.projects],
  );

  const submit = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const history = messages.map((message) => ({
      role: message.role === "builder" ? "user" : "assistant",
      text: message.text,
    }));

    setLoading(true);

    try {
      if (stage === "discovery") {
        const nextCount = discoveryCount + 1;
        const inferredThemes = themeCandidatesFromText(trimmed);
        const fallback = {
          reply: discoveryReply(builder, trimmed, nextCount),
          introDraft: `I'm Chuckie. ${builder.displayName} builds systems that become clearer the moment you see the work itself.`,
          themes: inferredThemes,
          promptStarts: [
            `What should I understand first about ${builder.displayName}?`,
            `What are ${builder.displayName}'s best examples of real work?`,
          ],
          readyForProjects: nextCount >= 2,
        };

        const response =
          (await requestStudioTurn({
            builder,
            history: [...history, { role: "user", text: trimmed }],
            userText: trimmed,
            stage,
          }).catch(() => null)) ?? fallback;

        if (response.themes?.length) {
          onUpdateListField("themes", uniq([...builder.themes, ...response.themes]));
        }

        if (response.promptStarts?.length) {
          onUpdateListField("promptStarts", uniq([...builder.promptStarts, ...response.promptStarts]));
        }

        if (response.introDraft) {
          onUpdateBuilderField("featuredIntroLine", response.introDraft);
        }

        setMessages((current) => [
          ...current,
          { role: "builder", text: trimmed },
          { role: "chuckie", text: response.reply || fallback.reply },
        ]);
        setDiscoveryCount(nextCount);

        if (response.readyForProjects || nextCount >= 2) {
          setStage("projects");
        }
      } else if (stage === "projects") {
        const currentProject =
          builder.projects.find((project) => project.id === activeProjectId) ?? null;
        const fallbackDraft = inferProjectDraft(trimmed);
        const fallback = {
          reply: currentProject
            ? `That helps. What should someone understand about ${currentProject.title} right away?`
            : projectReply(fallbackDraft.title, projectCount + 1),
          captureStatus: currentProject ? "project-captured" : "needs-more-context",
          projectDraft: fallbackDraft,
        };

        const response =
          (await requestStudioTurn({
            builder,
            history: [...history, { role: "user", text: trimmed }],
            userText: trimmed,
            stage,
            currentProject,
          }).catch(() => null)) ?? fallback;

        const draft = response.projectDraft ?? fallback.projectDraft;
        let projectId = activeProjectId;

        if (!projectId) {
          projectId = onCreateProject(buildProjectPayload(draft));
        } else {
          const patch = buildProjectPayload(draft);
          const existing = builder.projects.find((project) => project.id === projectId) ?? currentProject;

          onUpdateProjectField(projectId, "title", patch.title);
          onUpdateProjectField(projectId, "category", patch.category);
          onUpdateProjectField(projectId, "shortDescription", patch.shortDescription);
          onUpdateProjectField(projectId, "longDescription", patch.longDescription);
          onUpdateProjectField(projectId, "problem", patch.problem);
          onUpdateProjectField(projectId, "whatItIs", patch.whatItIs);
          onUpdateProjectField(projectId, "whyItMatters", patch.whyItMatters);
          onUpdateProjectField(projectId, "whatItDemonstrates", patch.whatItDemonstrates);
          onUpdateProjectField(projectId, "whyBuiltThisWay", patch.whyBuiltThisWay);
          onUpdateProjectField(projectId, "status", patch.status);
          onUpdateProjectField(projectId, "featured", patch.featured);
          onUpdateProjectField(projectId, "tags", patch.tags);
          onUpdateProjectField(projectId, "primaryLink", {
            ...(existing?.primaryLink ?? {}),
            ...patch.primaryLink,
          });
        }

        setSelectedProjectId(projectId);

        if (response.captureStatus === "project-captured") {
          setActiveProjectId(null);
          setProjectCount((current) => current + 1);
        } else {
          setActiveProjectId(projectId);
        }

        setMessages((current) => [
          ...current,
          { role: "builder", text: trimmed },
          { role: "chuckie", text: response.reply || fallback.reply },
        ]);
      }
    } finally {
      setLoading(false);
      setInput("");
      if (inputRef.current) {
        inputRef.current.style.height = "48px";
      }
    }
  };

  return (
    <div className="builder-flow">
      <div className="builder-flow-head">
        <h1>Teach Chuckie</h1>
        <p>Tell Chuckie about you and your work.</p>
      </div>

      <div className="builder-layout">
        <aside className="builder-stepper">
          {STAGES.map((item, index) => {
            const currentIndex = STAGES.findIndex((step) => step.id === stage);
            const state =
              index < currentIndex ? "completed" : index === currentIndex ? "active" : "upcoming";

            return (
              <button
                key={item.id}
                type="button"
                className={`builder-step builder-step-${state}`}
                onClick={() => setStage(item.id)}
              >
                <span className="builder-step-marker" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {stage !== "review" ? (
          <div className="builder-interview">
            <div className="builder-conversation">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`builder-line builder-line-${message.role}`}>
                {message.role === "chuckie" ? <div className="builder-avatar">🤙</div> : null}
                <p>{message.text}</p>
              </div>
            ))}
            </div>

            <div className="builder-composer">
              <textarea
                ref={inputRef}
                rows="1"
                value={input}
                disabled={loading}
                onChange={(event) => {
                  setInput(event.target.value);
                  event.target.style.height = "48px";
                  event.target.style.height = `${event.target.scrollHeight}px`;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder={
                  stage === "discovery"
                    ? "Answer naturally. Chuckie will infer the profile in the background."
                    : "Tell Chuckie about the next project. A link works too."
                }
              />
              <div className="builder-composer-actions">
                <button type="button" className="solid-button" onClick={submit} disabled={!input.trim() || loading}>
                  ↑
                </button>
                <button type="button" className="builder-review-link" onClick={() => setStage("review")}>
                  Open Review
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="builder-review">
            <div className="review-column">
              <div className="review-section">
                <div className="review-section-label">Intro Draft</div>
                <h2>{builder.featuredIntroLine}</h2>
              </div>

              <div className="review-section">
                <div className="review-section-label">Themes</div>
                <div className="review-inline-list">
                  {builder.themes.map((theme) => (
                    <span key={theme}>{theme}</span>
                  ))}
                </div>
              </div>

              <div className="review-section">
                <div className="review-section-label">Prompt Starts</div>
                <div className="review-inline-list muted">
                  {builder.promptStarts.slice(0, 5).map((prompt) => (
                    <span key={prompt}>{prompt}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="review-column">
              <div className="review-section">
                <div className="review-section-label">Featured Projects</div>
                <div className="review-project-list">
                  {featuredProjects.length ? (
                    featuredProjects.map((project) => (
                      <button key={project.id} type="button" className="review-project-link" onClick={() => setSelectedProjectId(project.id)}>
                        {project.title}
                      </button>
                    ))
                  ) : (
                    <p className="review-muted">No featured projects selected yet.</p>
                  )}
                </div>
              </div>

              <div className="review-section">
                <div className="review-section-label">Projects</div>
                <div className="review-project-stack">
                  {builder.projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      className={`review-project-row${selectedProject?.id === project.id ? " is-active" : ""}`}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <strong>{project.title}</strong>
                      <span>{project.shortDescription}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="review-actions">
                <button type="button" className="review-back-button" onClick={() => setStage("projects")}>
                  Back to Interview
                </button>
                <button type="button" className="builder-review-link" onClick={() => setManualOpen((current) => !current)}>
                  {manualOpen ? "Hide Manual Edit" : "Open Manual Edit"}
                </button>
              </div>

              {manualOpen ? (
                <ManualEditor
                  project={selectedProject}
                  onUpdateProjectField={onUpdateProjectField}
                  onToggleFeatured={onToggleFeatured}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
