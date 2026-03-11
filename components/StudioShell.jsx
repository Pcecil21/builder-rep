"use client";

import { useMemo, useRef, useState } from "react";
import BuilderSetup from "@/src/components/BuilderSetup";
import { slugify } from "@/lib/slug";

function formatPublishedAt(value) {
  if (!value) {
    return "Draft only";
  }

  return new Date(value).toLocaleString();
}

export default function StudioShell({
  email,
  initialBuilder,
  initialShareUrl,
  initialPublishedAt,
}) {
  const [builder, setBuilder] = useState(initialBuilder);
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [saveState, setSaveState] = useState("saved");
  const [saveError, setSaveError] = useState("");
  const [publishPending, setPublishPending] = useState(false);
  const saveTimeoutRef = useRef(null);
  const latestBuilderRef = useRef(initialBuilder);

  const publishLabel = useMemo(
    () => (publishedAt ? "Republish Public Rep" : "Publish Public Rep"),
    [publishedAt],
  );

  const persistBuilder = async (nextBuilder) => {
    setSaveState("saving");
    setSaveError("");

    try {
      const response = await fetch("/api/studio", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ builder: nextBuilder }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSaveState("error");
        setSaveError(payload.error || "Unable to save studio changes.");
        return false;
      }

      latestBuilderRef.current = payload.builder;
      setBuilder(payload.builder);
      setSaveState("saved");
      if (payload.shareUrl) {
        setShareUrl(payload.shareUrl);
      }
      if (payload.publishedAt) {
        setPublishedAt(payload.publishedAt);
      }
      return true;
    } catch {
      setSaveState("error");
      setSaveError("Unable to save studio changes.");
      return false;
    }
  };

  const scheduleSave = (nextBuilder) => {
    latestBuilderRef.current = nextBuilder;
    setSaveState("pending");
    setSaveError("");
    window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      persistBuilder(nextBuilder);
    }, 450);
  };

  const updateBuilder = (updater) => {
    setBuilder((current) => {
      const nextBuilder = typeof updater === "function" ? updater(current) : updater;
      scheduleSave(nextBuilder);
      return nextBuilder;
    });
  };

  const updateBuilderField = (field, value) => {
    updateBuilder((current) => {
      const next = { ...current, [field]: value };
      if (field === "displayName" || field === "name") {
        next.name = value;
      }
      return next;
    });
  };

  const updateListField = (field, value) => {
    updateBuilder((current) => ({ ...current, [field]: value }));
  };

  const updateProjectField = (projectId, field, value) => {
    updateBuilder((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, [field]: value } : project,
      ),
    }));
  };

  const deleteProject = (projectId) => {
    updateBuilder((current) => ({
      ...current,
      projects: current.projects.filter((project) => project.id !== projectId),
    }));
  };

  const createProject = (projectDraft) => {
    const id = `project-${Date.now()}`;
    updateBuilder((current) => ({
      ...current,
      projects: [
        ...current.projects,
        {
          id,
          ...projectDraft,
          featured: true,
          designNotes: projectDraft.designNotes ?? [],
          supportingLinks: projectDraft.supportingLinks ?? [],
          visuals: projectDraft.visuals ?? [],
          artifacts: projectDraft.artifacts ?? [],
        },
      ],
    }));
    return id;
  };

  const publish = async () => {
    setPublishPending(true);
    setSaveError("");

    try {
      window.clearTimeout(saveTimeoutRef.current);
      const saved = await persistBuilder(latestBuilderRef.current);

      if (!saved) {
        setPublishPending(false);
        return;
      }

      const response = await fetch("/api/studio/publish", {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSaveError(payload.error || "Unable to publish the builder rep.");
        return;
      }

      setShareUrl(payload.shareUrl);
      setPublishedAt(payload.publishedAt);
      if (payload.builder) {
        setBuilder(payload.builder);
        latestBuilderRef.current = payload.builder;
      }
    } catch {
      setSaveError("Unable to publish the builder rep.");
    } finally {
      setPublishPending(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div className="studio-shell">
      <div className="studio-topbar">
        <div>
          <div className="landing-eyebrow">Builder Studio</div>
          <strong>{email}</strong>
        </div>
        <button type="button" className="ghost-button" onClick={logout}>
          Log Out
        </button>
      </div>

      <div className="studio-meta-card">
        <div className="studio-meta-grid">
          <label>
            Display Name
            <input
              value={builder.displayName}
              onChange={(event) => updateBuilderField("displayName", event.target.value)}
            />
          </label>

          <label>
            Public Slug
            <input
              value={builder.slug}
              onChange={(event) => updateBuilderField("slug", slugify(event.target.value))}
            />
          </label>

          <label className="studio-meta-wide">
            Short Bio
            <textarea
              rows="2"
              value={builder.shortBio}
              onChange={(event) => updateBuilderField("shortBio", event.target.value)}
            />
          </label>
        </div>

        <div className="studio-meta-actions">
          <div className="studio-status-stack">
            <span className={`studio-save-pill studio-save-pill-${saveState}`}>
              {saveState === "saving"
                ? "Saving..."
                : saveState === "pending"
                  ? "Pending Save"
                  : saveState === "error"
                    ? "Save Error"
                    : "Saved"}
            </span>
            <span className="studio-published-copy">Last published: {formatPublishedAt(publishedAt)}</span>
          </div>

          <button
            type="button"
            className="solid-button"
            onClick={publish}
            disabled={publishPending}
          >
            {publishPending ? "Publishing..." : publishLabel}
          </button>
        </div>

        {saveError ? <div className="studio-error">{saveError}</div> : null}

        {shareUrl ? (
          <div className="studio-share-card">
            <div>
              <div className="review-section-label">Public Link</div>
              <a href={shareUrl} target="_blank" rel="noreferrer">
                {shareUrl}
              </a>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigator.clipboard?.writeText(shareUrl)}
            >
              Copy Link
            </button>
          </div>
        ) : null}
      </div>

      <div className="builder-frame">
        <BuilderSetup
          builder={builder}
          onUpdateBuilderField={updateBuilderField}
          onUpdateListField={updateListField}
          onCreateProject={createProject}
          onDeleteProject={deleteProject}
          onUpdateProjectField={updateProjectField}
        />
      </div>
    </div>
  );
}
