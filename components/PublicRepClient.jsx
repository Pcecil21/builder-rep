"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BuilderEcosystem from "@/components/BuilderEcosystem";
import {
  BrowseProjectRow,
  colorForProject,
  LinkOutObject,
  ProjectDetailObject,
  ShowcaseObject,
  ThinkingObject,
} from "@/src/components/RichObjects";
import { requestViewerTurn } from "@/src/lib/api";
import {
  buildInitialMessages,
  buildPromptActions,
  buildResponsePlan,
} from "@/src/lib/conversation";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getProject(builder, projectId) {
  return builder.projects.find((project) => project.id === projectId);
}

function buildViewerEntries(builder, payload) {
  const entries = [];

  if (payload.reply) {
    entries.push({ role: "assistant", text: payload.reply });
  }

  if (payload.intent === "showcase") {
    entries.push({
      role: "object",
      objectType: "showcase",
        data: {
          projectIds:
            payload.projectIds?.length
              ? payload.projectIds
              : builder.projects.map((project) => project.id),
        },
      });
  }

  if (payload.intent === "project-detail" && payload.projectIds?.[0]) {
    entries.push({
      role: "object",
      objectType: "project-detail",
      data: { projectId: payload.projectIds[0] },
    });
  }

  if (payload.intent === "thinking") {
    entries.push({
      role: "object",
      objectType: "thinking",
      data: {},
    });
  }

  if (payload.intent === "ecosystem") {
    entries.push({
      role: "object",
      objectType: "ecosystem",
      data: {},
    });
  }

  if (payload.intent === "linkout" && payload.projectIds?.[0]) {
    const project = getProject(builder, payload.projectIds[0]);

    if (project?.primaryLink) {
      entries.push({
        role: "object",
        objectType: "linkout",
        data: {
          projectId: project.id,
          link: project.primaryLink,
        },
      });
    }
  }

  return entries;
}

function getCategoryCounts(projects) {
  const counts = {};
  for (const project of projects) {
    const cat = project.category || "other";
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));
}

function getBuildTypeCounts(projects) {
  const counts = {};
  for (const project of projects) {
    const type = project.buildType || project.category || "other";
    counts[type] = (counts[type] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));
}

function getToolCounts(projects) {
  const counts = {};
  for (const project of projects) {
    if (project.tools) {
      for (const tool of project.tools) {
        counts[tool] = (counts[tool] || 0) + 1;
      }
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tool, count]) => ({ tool, count }));
}

function RepHero({ builder, slug, onScrollToChat }) {
  const themes = builder.highlightedThemes?.length
    ? builder.highlightedThemes
    : builder.themes?.slice(0, 3) || [];

  return (
    <section className="rep-hero">
      <div className="rep-hero-inner">
        <div className="rep-hero-copy">
          <div className="landing-eyebrow">Builder Rep</div>
          <h1 className="rep-hero-name">{builder.displayName}</h1>
          {builder.shortBio ? (
            <p className="rep-hero-bio">{builder.shortBio}</p>
          ) : null}
          {themes.length > 0 ? (
            <div className="rep-hero-themes">
              {themes.map((theme) => (
                <span key={theme} className="rep-theme-tag">{theme}</span>
              ))}
            </div>
          ) : null}
          <div className="rep-hero-stats">
            <div className="rep-stat">
              <span className="rep-stat-number">{builder.projects.length}</span>
              <span className="rep-stat-label">Projects</span>
            </div>
            <div className="rep-stat">
              <span className="rep-stat-number">{getCategoryCounts(builder.projects).length}</span>
              <span className="rep-stat-label">Categories</span>
            </div>
            <div className="rep-stat">
              <span className="rep-stat-number">{getToolCounts(builder.projects).length}+</span>
              <span className="rep-stat-label">Tools</span>
            </div>
          </div>
          <div className="rep-hero-actions">
            <button type="button" className="solid-button" onClick={onScrollToChat}>
              Talk to Chuckie
            </button>
            <a className="ghost-button" href={`/rep/${slug}/portfolio`}>
              Full Portfolio
            </a>
          </div>
        </div>
        <div className="rep-hero-visual">
          <div className="rep-hero-card">
            <div className="rep-hero-card-mark">◎</div>
            <div className="rep-hero-card-label">Chuckie</div>
            <div className="rep-hero-card-sub">{builder.displayName}'s AI representative</div>
            <div className="rep-hero-card-status">
              <span className="status-dot" />
              <span>Ready to chat</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatTheyBuild({ builder, onSelectProject }) {
  const categories = getCategoryCounts(builder.projects);
  const buildTypes = getBuildTypeCounts(builder.projects);
  const topTools = getToolCounts(builder.projects);
  const firstName = builder.displayName?.split(" ")[0] || builder.displayName;

  return (
    <section className="rep-builds-section">
      <div className="rep-builds-inner">
        <div className="rep-section-header">
          <div className="landing-eyebrow">Builder Profile</div>
          <h2 className="rep-section-title">What {firstName} builds</h2>
          <p className="rep-section-sub">
            A breakdown of the work across categories, build types, and tools.
          </p>
        </div>

        <div className="rep-builds-grid">
          <div className="rep-builds-card">
            <div className="rep-builds-card-title">By Category</div>
            <div className="rep-builds-card-list">
              {categories.map(({ category, count }) => (
                <div key={category} className="rep-builds-row">
                  <span className="rep-builds-row-label">{category}</span>
                  <span className="rep-builds-row-bar">
                    <span
                      className="rep-builds-row-fill"
                      style={{ width: `${Math.max(18, (count / builder.projects.length) * 100)}%` }}
                    />
                  </span>
                  <span className="rep-builds-row-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {buildTypes.length > 0 ? (
            <div className="rep-builds-card">
              <div className="rep-builds-card-title">By Build Type</div>
              <div className="rep-builds-card-list">
                {buildTypes.map(({ type, count }) => (
                  <div key={type} className="rep-builds-row">
                    <span className="rep-builds-row-label">{type}</span>
                    <span className="rep-builds-row-bar">
                      <span
                        className="rep-builds-row-fill"
                        style={{ width: `${Math.max(18, (count / builder.projects.length) * 100)}%` }}
                      />
                    </span>
                    <span className="rep-builds-row-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {topTools.length > 0 ? (
            <div className="rep-builds-card">
              <div className="rep-builds-card-title">Top Tools</div>
              <div className="rep-builds-tools-grid">
                {topTools.map(({ tool, count }) => (
                  <span key={tool} className="rep-tool-pill">
                    {tool}
                    <span className="rep-tool-count">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FeaturedProjects({ builder, onSelectProject }) {
  const featured = builder.projects.slice(0, 6);
  const firstName = builder.displayName?.split(" ")[0] || builder.displayName;

  return (
    <section className="rep-projects-section">
      <div className="rep-projects-inner">
        <div className="rep-section-header">
          <div className="landing-eyebrow">Featured Work</div>
          <h2 className="rep-section-title">{firstName}'s top projects</h2>
          <p className="rep-section-sub">
            Each project represents a real system, shipped and running.
          </p>
        </div>

        <div className="rep-projects-grid">
          {featured.map((project) => {
            const color = colorForProject(project);
            return (
              <button
                key={project.id}
                type="button"
                className="rep-project-card"
                onClick={() => onSelectProject(project.id)}
                style={{ "--project-color": color }}
              >
                <div className="rep-project-card-top">
                  <span className="rep-project-dot" style={{ background: color }} />
                  <span className="tag-pill">{project.category}</span>
                </div>
                <h3 className="rep-project-card-title">{project.title}</h3>
                <p className="rep-project-card-desc">{project.shortDescription}</p>
                {project.tools?.length > 0 ? (
                  <div className="rep-project-card-tools">
                    {project.tools.slice(0, 3).map((tool) => (
                      <span key={tool} className="rep-project-tool">{tool}</span>
                    ))}
                    {project.tools.length > 3 ? (
                      <span className="rep-project-tool">+{project.tools.length - 3}</span>
                    ) : null}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GuideRail({ prompts, onAsk }) {
  return (
    <aside className="guide-rail">
      <div className="guide-rail-label">Guide Questions</div>
      <div className="guide-rail-list">
        {prompts.map((prompt) => (
          <button key={prompt} type="button" className="guide-rail-link" onClick={() => onAsk(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
    </aside>
  );
}

function Typing() {
  return (
    <div className="message-row">
      <div className="avatar">◎</div>
      <div className="typing">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function MessageList({ builder, slug, messages, typing, onSelectProject, onLinkOut }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  return (
    <div className="conversation">
      {messages.map((message) => {
        if (message.role === "user") {
          return (
            <div key={message.id} className="message-row message-row-user">
              <div className="user-bubble">{message.text}</div>
            </div>
          );
        }

        if (message.role === "assistant") {
          return (
            <div key={message.id} className="message-row">
              <div className="avatar">◎</div>
              <div className="assistant-copy">{message.text}</div>
            </div>
          );
        }

        if (message.role === "object") {
          const projectIds =
            message.data.projectIds ?? (message.data.projectId ? [message.data.projectId] : []);
          const projects = projectIds.map((projectId) => getProject(builder, projectId)).filter(Boolean);

          let content = null;

          if (message.objectType === "showcase") {
            content = <ShowcaseObject projects={projects} onSelectProject={onSelectProject} />;
          }

          if (message.objectType === "project-detail") {
            content = <ProjectDetailObject project={projects[0]} onLinkOut={onLinkOut} />;
          }

          if (message.objectType === "thinking") {
            content = <ThinkingObject builder={builder} />;
          }

          if (message.objectType === "linkout") {
            content = <LinkOutObject project={projects[0]} link={message.data.link} />;
          }

          if (message.objectType === "ecosystem") {
            content = <BuilderEcosystem builder={builder} slug={slug} surface="chat" />;
          }

          return (
            <div key={message.id} className="rich-row">
              {content}
            </div>
          );
        }

        return null;
      })}
      {typing ? <Typing /> : null}
      <div ref={endRef} style={{ height: 20 }} />
    </div>
  );
}

function BrowseView({ builder, slug, onOpenProject }) {
  return (
    <div className="browse-wrap">
      <div className="browse-eyebrow">Portfolio</div>
      <h1>{builder.displayName}</h1>
      <p>{builder.shortBio}</p>
      <a className="browse-ecosystem-link" href={`/rep/${slug}/portfolio`}>
        Open the full ecosystem view
      </a>
      <div className="browse-list">
        {builder.projects.map((project) => (
          <BrowseProjectRow key={project.id} project={project} onOpen={onOpenProject} />
        ))}
      </div>
    </div>
  );
}

export default function PublicRepClient({ builder, slug }) {
  const [mode, setMode] = useState("chat");
  const [browseProjectId, setBrowseProjectId] = useState(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState(() => buildInitialMessages(builder));
  const promptStarts = useMemo(() => buildPromptActions(builder), [builder]);
  const chatRef = useRef(null);

  const scrollToChat = () => {
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const appendMessages = async (entries, options = {}) => {
    const { withTyping = true } = options;

    for (const entry of entries) {
      if (entry.role === "assistant" && withTyping) {
        setTyping(true);
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        setTyping(false);
      }

      setMessages((current) => [...current, { ...entry, id: makeId() }]);
    }
  };

  const showEcosystem = async () => {
    scrollToChat();
    await appendMessages(
      [
        {
          role: "assistant",
          text: "This is the fastest way to understand the full shape of the work.",
        },
        {
          role: "object",
          objectType: "ecosystem",
          data: {},
        },
      ],
      { withTyping: false },
    );
  };

  const sendUserMessage = async (userText) => {
    const trimmed = userText.trim();
    if (!trimmed || typing) {
      return;
    }

    scrollToChat();
    setMessages((current) => [...current, { id: makeId(), role: "user", text: trimmed }]);
    setInput("");
    setTyping(true);

    try {
      const payload = await requestViewerTurn({
        slug,
        history: [...messages, { role: "user", text: trimmed }],
        userText: trimmed,
      });

      const liveEntries = buildViewerEntries(builder, payload);
      await appendMessages(liveEntries.length ? liveEntries : buildResponsePlan(builder, trimmed), {
        withTyping: false,
      });
    } catch {
      await appendMessages(buildResponsePlan(builder, trimmed), { withTyping: false });
    } finally {
      setTyping(false);
    }
  };

  const handleSelectProject = async (projectId) => {
    const project = getProject(builder, projectId);
    if (!project) {
      return;
    }

    scrollToChat();
    await appendMessages([
      {
        role: "assistant",
        text: `${project.title} is worth opening up because it shows both the output and the system thinking behind it.`,
      },
      {
        role: "object",
        objectType: "project-detail",
        data: { projectId },
      },
      {
        role: "assistant",
        text: "That is the quick read. Ask Chuckie anything about the architecture or decisions behind it.",
      },
    ]);
  };

  const handleLinkOut = async (projectId) => {
    const project = getProject(builder, projectId);
    if (!project) {
      return;
    }

    await appendMessages([
      {
        role: "object",
        objectType: "linkout",
        data: { projectId, link: project.primaryLink },
      },
    ]);
  };

  const browseProject = browseProjectId ? getProject(builder, browseProjectId) : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">◎</div>
          <div>
            <strong>Chuckie</strong>
            <span>{builder.displayName}'s builder representative</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" className="ghost-button" onClick={showEcosystem}>
            See Full Ecosystem
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setMode((current) => {
                const next = current === "chat" ? "browse" : "chat";
                if (next === "chat") {
                  setBrowseProjectId(null);
                }
                return next;
              });
            }}
          >
            {mode === "chat" ? "Browse Portfolio" : "Back to Chat"}
          </button>
        </div>
      </header>

      {mode === "chat" ? (
        <>
          <RepHero builder={builder} slug={slug} onScrollToChat={scrollToChat} />

          {builder.projects.length > 0 ? (
            <>
              <WhatTheyBuild builder={builder} onSelectProject={handleSelectProject} />
              <FeaturedProjects builder={builder} onSelectProject={handleSelectProject} />
            </>
          ) : null}

          <section className="rep-chat-section" ref={chatRef}>
            <div className="rep-chat-section-header">
              <div className="landing-eyebrow">Ask Chuckie</div>
              <h2 className="rep-section-title">Talk to the representative</h2>
              <p className="rep-section-sub">
                Chuckie knows about {builder.displayName}'s work, process, and thinking.
                Ask anything.
              </p>
            </div>

            <div className="rep-chat-container">
              <div className="chat-layout">
                <div className="chat-frame">
                  <MessageList
                    builder={builder}
                    slug={slug}
                    messages={messages}
                    typing={typing}
                    onSelectProject={handleSelectProject}
                    onLinkOut={handleLinkOut}
                  />
                </div>
                <GuideRail prompts={promptStarts} onAsk={sendUserMessage} />
              </div>

              <div className="composer-shell">
                {messages.length === 1 && !typing ? (
                  <div className="starter-row">
                    {promptStarts.slice(0, 2).map((prompt) => (
                      <button key={prompt} type="button" className="starter-pill" onClick={() => sendUserMessage(prompt)}>
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="composer-row">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        sendUserMessage(input);
                      }
                    }}
                    placeholder={`Ask Chuckie about ${builder.displayName}'s work...`}
                  />
                  <button
                    type="button"
                    className="send-button"
                    onClick={() => sendUserMessage(input)}
                    disabled={!input.trim() || typing}
                  >
                    ↑
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <main className="main-area">
          <div className="browse-frame">
            {browseProject ? (
              <div className="browse-detail-wrap">
                <button type="button" className="browse-back" onClick={() => setBrowseProjectId(null)}>
                  ← Back to portfolio
                </button>
                <ProjectDetailObject project={browseProject} onLinkOut={handleLinkOut} />
              </div>
            ) : (
              <BrowseView builder={builder} slug={slug} onOpenProject={setBrowseProjectId} />
            )}
          </div>
        </main>
      )}
    </div>
  );
}
