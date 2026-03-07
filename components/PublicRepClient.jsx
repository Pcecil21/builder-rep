"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BrowseProjectRow,
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
            : builder.projects.filter((project) => project.featured).map((project) => project.id),
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

function MessageList({ builder, messages, typing, onSelectProject, onLinkOut }) {
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

function BrowseView({ builder, onOpenProject }) {
  return (
    <div className="browse-wrap">
      <div className="browse-eyebrow">Portfolio</div>
      <h1>{builder.displayName}</h1>
      <p>{builder.shortBio}</p>
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

  const sendUserMessage = async (userText) => {
    const trimmed = userText.trim();
    if (!trimmed || typing) {
      return;
    }

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

      <main className="main-area">
        {mode === "chat" ? (
          <div className="chat-layout">
            <div className="chat-frame">
              <MessageList
                builder={builder}
                messages={messages}
                typing={typing}
                onSelectProject={handleSelectProject}
                onLinkOut={handleLinkOut}
              />
            </div>
            <GuideRail prompts={promptStarts} onAsk={sendUserMessage} />
          </div>
        ) : (
          <div className="browse-frame">
            {browseProject ? (
              <div className="browse-detail-wrap">
                <button type="button" className="browse-back" onClick={() => setBrowseProjectId(null)}>
                  ← Back to portfolio
                </button>
                <ProjectDetailObject project={browseProject} onLinkOut={handleLinkOut} />
              </div>
            ) : (
              <BrowseView builder={builder} onOpenProject={setBrowseProjectId} />
            )}
          </div>
        )}
      </main>

      {mode === "chat" ? (
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
      ) : null}
    </div>
  );
}
