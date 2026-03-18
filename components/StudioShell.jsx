"use client";

import { useMemo, useRef, useState } from "react";
import { syncBuilderFromProfile } from "@/lib/builder-profile";
import BuilderStudio from "@/src/components/BuilderStudio";
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
  chatConfigured,
}) {
  const [builder, setBuilder] = useState(() => syncBuilderFromProfile(initialBuilder));
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [saveState, setSaveState] = useState("saved");
  const [saveError, setSaveError] = useState("");
  const [publishPending, setPublishPending] = useState(false);
  const saveTimeoutRef = useRef(null);
  const latestBuilderRef = useRef(syncBuilderFromProfile(initialBuilder));
  const saveRequestIdRef = useRef(0);

  const publishLabel = useMemo(
    () =>
      publishedAt ? "Republish Your Agent Representative" : "Publish Your Agent Representative",
    [publishedAt],
  );

  const persistBuilder = async (nextBuilder) => {
    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;
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
        if (requestId !== saveRequestIdRef.current) {
          return true;
        }

        setSaveState("error");
        setSaveError(payload.error || "Unable to save studio changes.");
        return false;
      }

      const syncedBuilder = syncBuilderFromProfile(payload.builder);
      if (requestId !== saveRequestIdRef.current) {
        return true;
      }

      latestBuilderRef.current = syncedBuilder;
      setBuilder(syncedBuilder);
      setSaveState("saved");
      if (payload.shareUrl) {
        setShareUrl(payload.shareUrl);
      }
      if (payload.publishedAt) {
        setPublishedAt(payload.publishedAt);
      }
      return true;
    } catch {
      if (requestId !== saveRequestIdRef.current) {
        return true;
      }

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
      const nextBuilder = syncBuilderFromProfile(
        typeof updater === "function" ? updater(current) : updater,
      );
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
        project.id === projectId
          ? {
              ...project,
              [field]: value,
              ...(field === "buildProfileType"
                ? {
                    buildType: value,
                    kind: value === "Agent" ? "agent" : "project",
                    primaryType: value,
                  }
                : {}),
            }
          : project,
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
        setSaveError(payload.error || "Unable to publish your agent representative.");
        return;
      }

      setShareUrl(payload.shareUrl);
      setPublishedAt(payload.publishedAt);
      if (payload.builder) {
        const syncedBuilder = syncBuilderFromProfile(payload.builder);
        setBuilder(syncedBuilder);
        latestBuilderRef.current = syncedBuilder;
      }
    } catch {
      setSaveError("Unable to publish your agent representative.");
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
            Live Public Bio
            <textarea rows="2" value={builder.shortBio} readOnly />
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
              <div className="review-section-label">Your Agent Representative (Rep) Link</div>
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
        <BuilderStudio
          builder={builder}
          onUpdateBuilder={updateBuilder}
          onCreateProject={createProject}
          onDeleteProject={deleteProject}
          onUpdateProjectField={updateProjectField}
          chatConfigured={chatConfigured}
        />
      </div>
    </div>
  );
}
