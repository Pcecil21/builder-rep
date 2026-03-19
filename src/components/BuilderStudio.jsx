"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BuilderSetup from "@/src/components/BuilderSetup";
import {
  buildInterviewQuestion,
  buildInterviewRecap,
  buildProjectInterviewQuestion,
  buildReturningInterviewQuestion,
  getNextInterviewField,
  hasInterviewSignal,
  TOOL_OPTIONS,
} from "@/lib/builder-profile";
import { requestStudioTurn } from "@/src/lib/api";

function buildProjectSeed() {
  const title = "New Build";

  return {
    kind: "project",
    primaryType: "",
    buildProfileType: "",
    buildType: "",
    focusAreas: [],
    title,
    category: "public app",
    githubRepoUrl: "",
    shortDescription: "",
    longDescription: "",
    problem: "",
    whatItIs: "",
    whyItMatters: "",
    whatItDemonstrates: "",
    whyBuiltThisWay: "",
    whatChuckieKnows: "",
    status: "prototype",
    featured: true,
    tags: [],
    tools: [],
    systems: [],
    primaryLink: {
      type: "website",
      title: `Open ${title}`,
      url: "",
      description: "",
    },
    supportingLinks: [],
    visuals: [],
  };
}

function getProjectEditorShape(project) {
  if (!project) {
    return null;
  }

  return {
    ...project,
    kind: project.kind === "agent" ? "agent" : "project",
    primaryType:
      typeof project.primaryType === "string"
        ? project.primaryType
        : typeof project.buildProfileType === "string"
          ? project.buildProfileType
          : typeof project.buildType === "string"
            ? project.buildType
            : "",
    buildProfileType:
      typeof project.buildProfileType === "string"
        ? project.buildProfileType
        : typeof project.buildType === "string"
          ? project.buildType
          : "",
    buildType:
      typeof project.buildType === "string"
        ? project.buildType
        : typeof project.buildProfileType === "string"
          ? project.buildProfileType
          : "",
    githubRepoUrl: typeof project.githubRepoUrl === "string" ? project.githubRepoUrl : "",
    focusAreas: Array.isArray(project.focusAreas) ? project.focusAreas : [],
    whatChuckieKnows: typeof project.whatChuckieKnows === "string" ? project.whatChuckieKnows : "",
    capabilities: Array.isArray(project.capabilities) ? project.capabilities : [],
    primaryLink:
      project.primaryLink && typeof project.primaryLink === "object"
        ? {
            type: typeof project.primaryLink.type === "string" ? project.primaryLink.type : "website",
            title: typeof project.primaryLink.title === "string" ? project.primaryLink.title : "",
            url: typeof project.primaryLink.url === "string" ? project.primaryLink.url : "",
            description:
              typeof project.primaryLink.description === "string" ? project.primaryLink.description : "",
          }
        : {
            type: "website",
            title: "",
            url: "",
            description: "",
          },
  };
}

function buildProjectFromCapture(projectDraft, userText) {
  const base = buildProjectSeed();
  const title = typeof projectDraft?.title === "string" && projectDraft.title.trim() ? projectDraft.title.trim() : base.title;

  return {
    ...base,
    title,
    category: typeof projectDraft?.category === "string" ? projectDraft.category : base.category,
    shortDescription:
      typeof projectDraft?.shortDescription === "string" ? projectDraft.shortDescription : base.shortDescription,
    longDescription:
      typeof projectDraft?.longDescription === "string" ? projectDraft.longDescription : base.longDescription,
    problem: typeof projectDraft?.problem === "string" ? projectDraft.problem : base.problem,
    whatItIs: typeof projectDraft?.whatItIs === "string" ? projectDraft.whatItIs : base.whatItIs,
    whyItMatters:
      typeof projectDraft?.whyItMatters === "string" ? projectDraft.whyItMatters : base.whyItMatters,
    whatItDemonstrates:
      typeof projectDraft?.whatItDemonstrates === "string"
        ? projectDraft.whatItDemonstrates
        : base.whatItDemonstrates,
    whyBuiltThisWay:
      typeof projectDraft?.whyBuiltThisWay === "string" ? projectDraft.whyBuiltThisWay : base.whyBuiltThisWay,
    status: typeof projectDraft?.status === "string" ? projectDraft.status : base.status,
    featured: typeof projectDraft?.featured === "boolean" ? projectDraft.featured : base.featured,
    tags: Array.isArray(projectDraft?.tags) ? projectDraft.tags : base.tags,
    whatChuckieKnows: typeof userText === "string" ? userText.trim() : "",
    primaryLink: {
      ...base.primaryLink,
      title: `Open ${title}`,
      url: typeof projectDraft?.primaryLinkUrl === "string" ? projectDraft.primaryLinkUrl : "",
    },
  };
}

function appendKnowledge(existing, nextNote) {
  const current = typeof existing === "string" ? existing.trim() : "";
  const addition = typeof nextNote === "string" ? nextNote.trim() : "";

  if (!addition) {
    return current;
  }

  if (!current) {
    return addition;
  }

  return `${current}\n\n${addition}`;
}

function buildChatHistory(entries) {
  return entries
    .filter((entry) => (entry.role === "user" || entry.role === "assistant") && entry.kind !== "recap")
    .map((entry) => ({
      role: entry.role,
      text: entry.text,
    }));
}

function ToolBucket({ title, helper, selected, onToggle }) {
  return (
    <div className="studio-section-block">
      <div className="review-section-label">{title}</div>
      <p className="review-subcopy">{helper}</p>
      <div className="focus-area-grid">
        {TOOL_OPTIONS.map((tool) => {
          const active = selected.includes(tool);
          return (
            <button
              key={tool}
              type="button"
              className={`focus-area-pill${active ? " focus-area-pill-active" : ""}`}
              onClick={() => onToggle(tool)}
            >
              <strong>{tool}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StarterCards({
  hasSignal,
  chatConfigured,
  onStartInterview,
  onUpdateWhatChuckieKnows,
  onStartWithBuild,
  onOpenStudio,
}) {
  return (
    <div className="interview-starter-grid">
      <button type="button" className="interview-starter-card" onClick={onStartInterview} disabled={!chatConfigured}>
        <strong>{hasSignal ? "Keep the interview going" : "Start my interview"}</strong>
        <span>{hasSignal ? "Keep teaching Chuckie through the chat." : "Let Chuckie start learning about you."}</span>
      </button>

      <button type="button" className="interview-starter-card" onClick={onStartWithBuild} disabled={!chatConfigured}>
        <strong>Start with a build</strong>
        <span>Lead with the first project Chuckie should understand.</span>
      </button>

      <button
        type="button"
        className="interview-starter-card"
        onClick={onUpdateWhatChuckieKnows}
        disabled={!chatConfigured || !hasSignal}
      >
        <strong>Update what you know</strong>
        <span>See Chuckie's current picture, then tell it what changed.</span>
      </button>

      <button type="button" className="interview-starter-card" onClick={onOpenStudio}>
        <strong>Open studio</strong>
        <span>Jump to the structured editor when you want manual control.</span>
      </button>
    </div>
  );
}

function RecapCard({ recap }) {
  return (
    <div className="interview-recap-card">
      <div className="review-section-label">What Chuckie Knows</div>
      <h3>{recap.headline}</h3>
      {recap.bullets.length ? (
        <ol className="interview-recap-list">
          {recap.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ol>
      ) : (
        <p>Not much yet. Start the interview and Chuckie will build the picture through the conversation.</p>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="builder-line builder-line-chuckie">
      <div className="builder-avatar">◎</div>
      <div className="typing">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ChatThread({ history, loading }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, loading]);

  return (
    <div className="studio-chat-surface interview-thread">
      <div className="builder-conversation">
        {history.map((entry, index) =>
          entry.kind === "recap" ? (
            <RecapCard key={`recap-${index}`} recap={entry.recap} />
          ) : entry.role === "user" ? (
            <div key={`${entry.role}-${index}`} className="builder-line builder-line-builder">
              <p>{entry.text}</p>
            </div>
          ) : (
            <div key={`${entry.role}-${index}`} className="builder-line builder-line-chuckie">
              <div className="builder-avatar">◎</div>
              <p>{entry.text}</p>
            </div>
          ),
        )}
        {loading ? <TypingIndicator /> : null}
        <div ref={endRef} style={{ height: 1 }} />
      </div>
    </div>
  );
}

function KnowledgePanel({ builder, onUpdateBuilder, onToggleTool }) {
  const recap = useMemo(() => buildInterviewRecap(builder), [builder]);

  return (
    <div className="interview-stack">
      <RecapCard recap={recap} />

      <div className="studio-panel">
        <div className="studio-panel-head">
          <div className="review-section-label">Structured Context</div>
          <h2>Tools and GitHub</h2>
          <p>Give Chuckie context it can use to ask better questions. Everything else comes from the conversation.</p>
        </div>

        <ToolBucket
          title="Tools You Use Regularly"
          helper="These help Chuckie place how you actually build."
          selected={builder.toolStack.regular}
          onToggle={(tool) => onToggleTool("regular", tool)}
        />

        <ToolBucket
          title="Tools You're Familiar With"
          helper="Use this for tools you can speak to even if they're not in the core stack."
          selected={builder.toolStack.familiar}
          onToggle={(tool) => onToggleTool("familiar", tool)}
        />

        <div className="studio-section-block">
          <div className="review-section-label">GitHub Context</div>
          <div className="studio-form-grid">
            <label className="studio-form-wide">
              GitHub Profile URL
              <input
                value={builder.github.profileUrl}
                onChange={(event) =>
                  onUpdateBuilder((current) => ({
                    ...current,
                    github: {
                      ...current.github,
                      profileUrl: event.target.value,
                    },
                  }))
                }
                placeholder="https://github.com/your-handle"
              />
            </label>

            <label className="studio-form-wide">
              Repo URLs to Start With
              <textarea
                rows="4"
                value={builder.github.repoUrls.join("\n")}
                onChange={(event) =>
                  onUpdateBuilder((current) => ({
                    ...current,
                    github: {
                      ...current.github,
                      repoUrls: event.target.value
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    },
                  }))
                }
                placeholder={"https://github.com/you/project-one\nhttps://github.com/you/project-two"}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComposerBar({ input, onInputChange, onSubmit, chatConfigured, loading }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (chatConfigured && input.trim() && !loading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="builder-composer interview-composer-shell">
      <div className="interview-composer-row">
        <textarea
          ref={textareaRef}
          rows="1"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell Chuckie what's top of mind, or answer its last question."
          disabled={!chatConfigured}
        />
        <button
          type="button"
          className="solid-button builder-send-button"
          onClick={onSubmit}
          disabled={!chatConfigured || !input.trim() || loading}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

function InterviewPanel({
  builder,
  history,
  input,
  loading,
  error,
  chatConfigured,
  onInputChange,
  onSubmit,
  onStartInterview,
  onUpdateWhatChuckieKnows,
  onStartWithBuild,
  onOpenStudio,
}) {
  const hasSignal = hasInterviewSignal(builder);

  return (
    <div className="interview-stack">
      {!history.length ? (
        <div className="studio-panel interview-hero">
          <div className="interview-hero-mark">◎</div>
          <div className="studio-panel-head">
            <div className="review-section-label">Chat Interview</div>
            <h2>Talk to Chuckie</h2>
            <p>
              Start the conversation and Chuckie will keep building a clearer picture of who you
              are and what you make.
            </p>
          </div>

          {hasSignal ? <RecapCard recap={buildInterviewRecap(builder)} /> : null}

          <StarterCards
            hasSignal={hasSignal}
            chatConfigured={chatConfigured}
            onStartInterview={onStartInterview}
            onUpdateWhatChuckieKnows={onUpdateWhatChuckieKnows}
            onStartWithBuild={onStartWithBuild}
            onOpenStudio={onOpenStudio}
          />
        </div>
      ) : (
        <ChatThread history={history} loading={loading} />
      )}

      {!chatConfigured ? (
        <div className="interview-config-card">
          <div className="review-section-label">Model Required</div>
          <strong>Chuckie interview is offline until a real model is configured.</strong>
          <p>Set a valid OpenAI API key for this environment before using the interview.</p>
        </div>
      ) : null}

      <ComposerBar
        input={input}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        chatConfigured={chatConfigured}
        loading={loading}
      />

      {error ? <div className="studio-error">{error}</div> : null}
    </div>
  );
}

export default function BuilderStudio({
  builder,
  onUpdateBuilder,
  onCreateProject,
  onDeleteProject,
  onUpdateProjectField,
  chatConfigured = false,
}) {
  const [tab, setTab] = useState("chat");
  const [mode, setMode] = useState("profile");
  const [focusField, setFocusField] = useState(() => getNextInterviewField(builder));
  const [selectedProjectId, setSelectedProjectId] = useState(builder.projects[0]?.id ?? "");
  const [history, setHistory] = useState(() =>
    Array.isArray(builder.chatHistory) && builder.chatHistory.length > 0
      ? builder.chatHistory
      : [],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeProject = getProjectEditorShape(
    builder.projects.find((project) => project.id === selectedProjectId) ?? builder.projects[0] ?? null,
  );

  useEffect(() => {
    if (history.length > 0) {
      onUpdateBuilder((current) => ({
        ...current,
        chatHistory: history
          .filter((entry) => entry.role === "user" || entry.role === "assistant")
          .slice(-40),
      }));
    }
  }, [history]);

  useEffect(() => {
    if (!selectedProjectId && builder.projects[0]?.id) {
      setSelectedProjectId(builder.projects[0].id);
      return;
    }

    if (selectedProjectId && !builder.projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(builder.projects[0]?.id ?? "");
    }
  }, [builder.projects, selectedProjectId]);

  useEffect(() => {
    if (mode === "profile" && builder.profile[focusField]) {
      setFocusField(getNextInterviewField(builder));
    }
  }, [builder.profile, focusField, mode]);

  const updateBuilderField = (field, value) => {
    onUpdateBuilder((current) => {
      const next = { ...current, [field]: value };
      if (field === "displayName" || field === "name") {
        next.name = value;
      }
      return next;
    });
  };

  const updateListField = (field, value) => {
    onUpdateBuilder((current) => ({ ...current, [field]: value }));
  };

  const toggleTool = (bucket, tool) => {
    onUpdateBuilder((current) => {
      const nextRegular = current.toolStack.regular.includes(tool)
        ? current.toolStack.regular.filter((item) => item !== tool)
        : bucket === "regular"
          ? [...current.toolStack.regular, tool]
          : current.toolStack.regular.filter((item) => item !== tool);
      const nextFamiliar = current.toolStack.familiar.includes(tool)
        ? current.toolStack.familiar.filter((item) => item !== tool)
        : bucket === "familiar"
          ? [...current.toolStack.familiar.filter((item) => item !== tool), tool]
          : current.toolStack.familiar.filter((item) => item !== tool);

      return {
        ...current,
        toolStack: {
          regular: nextRegular.filter((item, index, array) => array.indexOf(item) === index),
          familiar: nextFamiliar
            .filter((item) => !nextRegular.includes(item))
            .filter((item, index, array) => array.indexOf(item) === index),
        },
      };
    });
  };

  const startInterview = () => {
    if (!chatConfigured) {
      return;
    }

    const nextField = getNextInterviewField(builder);
    setMode("profile");
    setFocusField(nextField);
    setError("");
    setInput("");
    setHistory([
      {
        role: "assistant",
        text: hasInterviewSignal(builder)
          ? buildReturningInterviewQuestion(builder)
          : buildInterviewQuestion(nextField, builder),
      },
    ]);
  };

  const updateWhatChuckieKnows = () => {
    if (!chatConfigured) {
      return;
    }

    setMode("profile");
    setFocusField(builder.profile.currentFocus ? "currentFocus" : getNextInterviewField(builder));
    setError("");
    setInput("");
    setHistory([
      {
        role: "assistant",
        kind: "recap",
        recap: buildInterviewRecap(builder),
      },
      {
        role: "assistant",
        text: buildReturningInterviewQuestion(builder),
      },
    ]);
  };

  const startWithBuild = () => {
    if (!chatConfigured) {
      return;
    }

    setMode("build");
    setError("");
    setInput("");
    setHistory([
      {
        role: "assistant",
        text: buildProjectInterviewQuestion(builder, activeProject),
      },
    ]);
  };

  const submit = async () => {
    const trimmed = input.trim();

    if (!chatConfigured || !trimmed || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setInput("");
    setHistory((current) => [...current, { role: "user", text: trimmed }]);

    try {
      const requestHistory = buildChatHistory(history);

      if (mode === "build") {
        if (activeProject) {
          const response = await requestStudioTurn({
            history: requestHistory,
            userText: trimmed,
            context: "build",
            projectId: activeProject.id,
            currentProject: activeProject,
          });

          onUpdateProjectField(
            activeProject.id,
            "whatChuckieKnows",
            appendKnowledge(activeProject.whatChuckieKnows, response.knowledgeNote || trimmed),
          );
          onUpdateBuilder((current) => ({
            ...current,
            onboarding: {
              ...current.onboarding,
              studioReady: true,
              currentStep: "projects",
            },
          }));

          setHistory((current) => [...current, { role: "assistant", text: response.reply || "Captured." }]);
        } else {
          const response = await requestStudioTurn({
            history: requestHistory,
            userText: trimmed,
            context: "build",
          });

          if (response.projectDraft) {
            const projectId = onCreateProject(buildProjectFromCapture(response.projectDraft, trimmed));
            setSelectedProjectId(projectId);
          }

          onUpdateBuilder((current) => ({
            ...current,
            onboarding: {
              ...current.onboarding,
              studioReady: true,
              currentStep: "projects",
            },
          }));

          setHistory((current) => [...current, { role: "assistant", text: response.reply || "Captured." }]);
        }

        return;
      }

      const response = await requestStudioTurn({
        history: requestHistory,
        userText: trimmed,
        context: "profile",
      });

      const fieldToUpdate = response.profileField || focusField;
      const nextField = response.nextFocusField || fieldToUpdate;

      onUpdateBuilder((current) => ({
        ...current,
        profile: {
          ...current.profile,
          [fieldToUpdate]: response.fieldValue || trimmed,
        },
        onboarding: {
          ...current.onboarding,
          currentStep: "interview",
          studioReady: true,
          interviewResponses: Math.max(current.onboarding.interviewResponses, 1),
        },
      }));

      setFocusField(nextField);
      setHistory((current) => [...current, { role: "assistant", text: response.reply || "Captured." }]);
    } catch (submitError) {
      setHistory((current) => current.slice(0, -1));
      setInput(trimmed);
      setError(submitError instanceof Error ? submitError.message : "Unable to talk to Chuckie right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="interview-shell">
      <div className="studio-shell-tabs">
        <button
          type="button"
          className={`studio-shell-tab${tab === "chat" ? " studio-shell-tab-active" : ""}`}
          onClick={() => setTab("chat")}
        >
          Chat
        </button>
        <button
          type="button"
          className={`studio-shell-tab${tab === "knowledge" ? " studio-shell-tab-active" : ""}`}
          onClick={() => setTab("knowledge")}
        >
          What Chuckie Knows
        </button>
        <button
          type="button"
          className={`studio-shell-tab${tab === "studio" ? " studio-shell-tab-active" : ""}`}
          onClick={() => setTab("studio")}
        >
          Studio
        </button>
      </div>

      {tab === "chat" ? (
        <InterviewPanel
          builder={builder}
          history={history}
          input={input}
          loading={loading}
          error={error}
          chatConfigured={chatConfigured}
          onInputChange={setInput}
          onSubmit={submit}
          onStartInterview={startInterview}
          onUpdateWhatChuckieKnows={updateWhatChuckieKnows}
          onStartWithBuild={startWithBuild}
          onOpenStudio={() => setTab("studio")}
        />
      ) : tab === "knowledge" ? (
        <KnowledgePanel builder={builder} onUpdateBuilder={onUpdateBuilder} onToggleTool={toggleTool} />
      ) : (
        <BuilderSetup
          builder={builder}
          onUpdateBuilderField={updateBuilderField}
          onUpdateListField={updateListField}
          onCreateProject={onCreateProject}
          onDeleteProject={onDeleteProject}
          onUpdateProjectField={onUpdateProjectField}
        />
      )}
    </div>
  );
}
