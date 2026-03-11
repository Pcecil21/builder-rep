"use client";

import { useMemo, useState } from "react";
import { FOCUS_AREAS, PRIMARY_TYPES } from "@/lib/build-taxonomy";
import { getAxisById } from "@/lib/radar";
import { requestStudioTurn } from "../lib/api";

const PROFILE_QUESTIONS = [
  {
    id: "builder-kind",
    label: "Builder framing",
    prompt: "What kind of builder are you?",
  },
  {
    id: "builder-patterns",
    label: "Recurring patterns",
    prompt: "What patterns tie your work together?",
  },
  {
    id: "builder-opening",
    label: "Opening angle",
    prompt: "What should Chuckie lead with?",
  },
];

const BUILD_QUESTIONS = [
  {
    id: "build-what",
    label: "What it is",
    prompt: "What is this build?",
  },
  {
    id: "build-why",
    label: "Why it exists",
    prompt: "Why did you build it?",
  },
  {
    id: "build-key",
    label: "Key takeaway",
    prompt: "What should someone understand right away?",
  },
];

function looksEmpty(value, placeholders = []) {
  if (typeof value !== "string" || !value.trim()) {
    return true;
  }

  return placeholders.some((placeholder) => value.includes(placeholder));
}

function getNextProfileQuestion(builder) {
  if (looksEmpty(builder.shortBio, ["Builder profile in progress."])) {
    return PROFILE_QUESTIONS[0];
  }

  if (looksEmpty(builder.longerIntro)) {
    return PROFILE_QUESTIONS[1];
  }

  if (looksEmpty(builder.featuredIntroLine, ["teaching me how to represent the work clearly"])) {
    return PROFILE_QUESTIONS[2];
  }

  return PROFILE_QUESTIONS[2];
}

function getNextBuildQuestion(build) {
  if (!build) {
    return BUILD_QUESTIONS[0];
  }

  if (looksEmpty(build.whatItIs, ["Drafted from conversation."])) {
    return BUILD_QUESTIONS[0];
  }

  if (looksEmpty(build.whyItMatters, ["Waiting for builder emphasis."])) {
    return BUILD_QUESTIONS[1];
  }

  if (looksEmpty(build.whatItDemonstrates, ["Waiting for builder emphasis."])) {
    return BUILD_QUESTIONS[2];
  }

  return BUILD_QUESTIONS[2];
}

function buildDraft() {
  const title = "New Build";

  return {
    kind: "project",
    primaryType: "",
    focusAreas: [],
    title,
    category: "public app",
    shortDescription: "",
    longDescription: "",
    problem: "",
    whatItIs: "",
    whyItMatters: "",
    whatItDemonstrates: "",
    whyBuiltThisWay: "",
    status: "prototype",
    featured: false,
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
    primaryType: typeof project.primaryType === "string" ? project.primaryType : "",
    focusAreas: Array.isArray(project.focusAreas) ? project.focusAreas : [],
    buildType: typeof project.buildType === "string" ? project.buildType : "",
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
    supportingLinks: Array.isArray(project.supportingLinks)
      ? project.supportingLinks.map((link) => ({
          type: typeof link?.type === "string" ? link.type : "website",
          title: typeof link?.title === "string" ? link.title : "",
          url: typeof link?.url === "string" ? link.url : "",
          description: typeof link?.description === "string" ? link.description : "",
        }))
      : [],
    visuals: Array.isArray(project.visuals)
      ? project.visuals.map((visual) => ({
          title: typeof visual?.title === "string" ? visual.title : "",
          description: typeof visual?.description === "string" ? visual.description : "",
          url: typeof visual?.url === "string" ? visual.url : "",
          path: typeof visual?.path === "string" ? visual.path : "",
        }))
      : [],
  };
}

function BuilderProfileEditor({ builder, onUpdateBuilderField, onUpdateListField }) {
  return (
    <div className="studio-panel">
      <div className="studio-panel-head">
        <div className="review-section-label">About You</div>
        <h2>Set the core builder framing first</h2>
        <p>This is the stable context Chuckie should know before he starts helping shape the individual builds.</p>
      </div>

      <div className="studio-form-grid">
        <label className="studio-form-wide">
          What Chuckie says first
          <textarea
            rows="3"
            value={builder.featuredIntroLine}
            onChange={(event) => onUpdateBuilderField("featuredIntroLine", event.target.value)}
          />
        </label>

        <label className="studio-form-wide">
          Longer intro
          <textarea
            rows="4"
            value={builder.longerIntro}
            onChange={(event) => onUpdateBuilderField("longerIntro", event.target.value)}
          />
        </label>

        <label className="studio-form-wide">
          Themes
          <input
            value={builder.themes.join(", ")}
            onChange={(event) =>
              onUpdateListField(
                "themes",
                event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
            placeholder="Agent systems, orchestration, AI-native product design"
          />
        </label>
      </div>
    </div>
  );
}

function LinkListEditor({ project, onUpdateProjectField }) {
  const updatePrimaryLink = (field, value) => {
    onUpdateProjectField(project.id, "primaryLink", {
      ...project.primaryLink,
      [field]: value,
    });
  };

  const updateSupportingLink = (index, field, value) => {
    const nextLinks = project.supportingLinks.map((link, linkIndex) =>
      linkIndex === index ? { ...link, [field]: value } : link,
    );

    onUpdateProjectField(project.id, "supportingLinks", nextLinks);
  };

  const addSupportingLink = () => {
    onUpdateProjectField(project.id, "supportingLinks", [
      ...project.supportingLinks,
      {
        type: "website",
        title: "",
        url: "",
        description: "",
      },
    ]);
  };

  const removeSupportingLink = (index) => {
    onUpdateProjectField(
      project.id,
      "supportingLinks",
      project.supportingLinks.filter((_, linkIndex) => linkIndex !== index),
    );
  };

  return (
    <div className="studio-section-block">
      <div className="review-section-label">Relevant Links</div>
      <div className="studio-form-grid">
        <label>
          Primary link label
          <input
            value={project.primaryLink.title}
            onChange={(event) => updatePrimaryLink("title", event.target.value)}
            placeholder="Open Holmes"
          />
        </label>

        <label>
          Primary link URL
          <input
            value={project.primaryLink.url}
            onChange={(event) => updatePrimaryLink("url", event.target.value)}
            placeholder="https://example.com"
          />
        </label>

        <label className="studio-form-wide">
          Primary link description
          <input
            value={project.primaryLink.description}
            onChange={(event) => updatePrimaryLink("description", event.target.value)}
            placeholder="Best place to send someone first"
          />
        </label>
      </div>

      <div className="studio-subsection-head">
        <strong>Additional links</strong>
        <button type="button" className="ghost-button" onClick={addSupportingLink}>
          Add link
        </button>
      </div>

      <div className="studio-link-stack">
        {project.supportingLinks.map((link, index) => (
          <div key={`${project.id}-supporting-${index}`} className="studio-link-card">
            <div className="studio-form-grid">
              <label>
                Label
                <input
                  value={link.title}
                  onChange={(event) => updateSupportingLink(index, "title", event.target.value)}
                />
              </label>
              <label>
                URL
                <input
                  value={link.url}
                  onChange={(event) => updateSupportingLink(index, "url", event.target.value)}
                />
              </label>
              <label className="studio-form-wide">
                Description
                <input
                  value={link.description}
                  onChange={(event) => updateSupportingLink(index, "description", event.target.value)}
                />
              </label>
            </div>
            <button type="button" className="builder-review-link" onClick={() => removeSupportingLink(index)}>
              Remove link
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenshotUploader({ project, onUpdateProjectField }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const uploadFiles = async (fileList) => {
    if (!fileList?.length) {
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const nextVisuals = [...project.visuals];

      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/studio/uploads", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Unable to upload screenshot.");
        }

        nextVisuals.push(payload.visual);
      }

      onUpdateProjectField(project.id, "visuals", nextVisuals);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to upload screenshot.");
    } finally {
      setUploading(false);
    }
  };

  const updateVisual = (index, field, value) => {
    onUpdateProjectField(
      project.id,
      "visuals",
      project.visuals.map((visual, visualIndex) =>
        visualIndex === index ? { ...visual, [field]: value } : visual,
      ),
    );
  };

  const removeVisual = (index) => {
    onUpdateProjectField(
      project.id,
      "visuals",
      project.visuals.filter((_, visualIndex) => visualIndex !== index),
    );
  };

  return (
    <div className="studio-section-block">
      <div className="studio-subsection-head">
        <div>
          <div className="review-section-label">Screenshots</div>
          <p className="review-subcopy">Upload real screenshots and keep their captions editable.</p>
        </div>
        <label className="ghost-button studio-upload-button">
          {uploading ? "Uploading..." : "Upload screenshot"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            hidden
            onChange={(event) => uploadFiles(event.target.files)}
          />
        </label>
      </div>

      {uploadError ? <div className="studio-error">{uploadError}</div> : null}

      <div className="studio-visual-grid">
        {project.visuals.map((visual, index) => (
          <div key={`${project.id}-visual-${index}`} className="studio-visual-card">
            {visual.url ? <img src={visual.url} alt={visual.title || "Uploaded screenshot"} /> : null}
            <label>
              Caption
              <input
                value={visual.title}
                onChange={(event) => updateVisual(index, "title", event.target.value)}
              />
            </label>
            <label>
              Notes
              <input
                value={visual.description}
                onChange={(event) => updateVisual(index, "description", event.target.value)}
              />
            </label>
            <button type="button" className="builder-review-link" onClick={() => removeVisual(index)}>
              Remove screenshot
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrimaryTypePicker({ project, onUpdateProjectField }) {
  return (
    <div className="studio-section-block">
      <div className="review-section-label">Primary Type</div>
      <p className="review-subcopy">Use the wider taxonomy here. The public portfolio radar will derive its narrower categories automatically.</p>
      <div className="taxonomy-grid">
        {PRIMARY_TYPES.map((type) => {
          const active = project.primaryType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              className={`taxonomy-pill${active ? " taxonomy-pill-active" : ""}`}
              onClick={() => onUpdateProjectField(project.id, "primaryType", type.id)}
            >
              <span>{type.icon}</span>
              <strong>{type.label}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FocusAreaPicker({ project, onUpdateProjectField }) {
  const toggleFocusArea = (focusAreaId) => {
    const nextFocusAreas = project.focusAreas.includes(focusAreaId)
      ? project.focusAreas.filter((item) => item !== focusAreaId)
      : [...project.focusAreas, focusAreaId];

    onUpdateProjectField(project.id, "focusAreas", nextFocusAreas);
  };

  return (
    <div className="studio-section-block">
      <div className="review-section-label">What does this build primarily do?</div>
      <p className="review-subcopy">Select up to three if you want to keep the taxonomy tight, but the form allows more.</p>
      <div className="focus-area-grid">
        {FOCUS_AREAS.map((area) => {
          const active = project.focusAreas.includes(area.id);
          return (
            <button
              key={area.id}
              type="button"
              className={`focus-area-pill${active ? " focus-area-pill-active" : ""}`}
              onClick={() => toggleFocusArea(area.id)}
            >
              <span>{area.icon}</span>
              <strong>{area.label}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DerivedMapping({ project }) {
  return (
    <div className="studio-derived-card">
      <div className="review-section-label">Portfolio Mapping</div>
      <div className="studio-derived-row">
        <span>Radar build type</span>
        <strong>{project.buildType || "Not derived yet"}</strong>
      </div>
      <div className="studio-derived-row studio-derived-row-stack">
        <span>Radar capability axes</span>
        <div className="studio-derived-tags">
          {project.capabilities.length ? (
            project.capabilities.map((capabilityId) => {
              const axis = getAxisById(capabilityId);
              return (
                <span key={capabilityId} className="ecosystem-capability-tag">
                  {axis?.icon} {axis?.short}
                </span>
              );
            })
          ) : (
            <span className="review-muted">Choose a broader taxonomy above and this will fill automatically.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function BuildEditor({ project, onUpdateProjectField, onToggleFeatured }) {
  if (!project) {
    return (
      <div className="studio-panel">
        <div className="studio-panel-head">
          <div className="review-section-label">Build Editor</div>
          <h2>Add your first build</h2>
          <p>Start with the build itself, then fill in the facts before you talk to Chuckie about it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-panel">
      <div className="studio-panel-head">
        <div className="review-section-label">Build</div>
        <h2>{project.title || "Untitled Build"}</h2>
        <p>Enter the raw material first. Chuckie can sharpen the framing after the basics are in place.</p>
      </div>

      <div className="studio-form-grid">
        <label>
          Name
          <input
            value={project.title}
            onChange={(event) => onUpdateProjectField(project.id, "title", event.target.value)}
            placeholder="Holmes, Sponsor Dashboard, Chuckie Team Radar"
          />
        </label>

        <label className="studio-form-wide">
          Description
          <textarea
            rows="3"
            value={project.shortDescription}
            onChange={(event) => onUpdateProjectField(project.id, "shortDescription", event.target.value)}
            placeholder="What it is in one clear line"
          />
        </label>

        <label className="studio-form-wide">
          More context
          <textarea
            rows="5"
            value={project.longDescription}
            onChange={(event) => onUpdateProjectField(project.id, "longDescription", event.target.value)}
            placeholder="What the build does, where it lives, and what makes it interesting"
          />
        </label>
      </div>

      <PrimaryTypePicker project={project} onUpdateProjectField={onUpdateProjectField} />
      <FocusAreaPicker project={project} onUpdateProjectField={onUpdateProjectField} />
      <LinkListEditor project={project} onUpdateProjectField={onUpdateProjectField} />
      <ScreenshotUploader project={project} onUpdateProjectField={onUpdateProjectField} />
      <DerivedMapping project={project} />

      <label className="review-featured-toggle">
        <input type="checkbox" checked={project.featured} onChange={() => onToggleFeatured(project.id)} />
        Featured on the public rep
      </label>
    </div>
  );
}

function ChuckieRefinePanel({
  builder,
  selectedProject,
  onUpdateBuilderField,
  onUpdateListField,
  onUpdateProjectField,
}) {
  const [target, setTarget] = useState(selectedProject ? "build" : "profile");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const question = target === "profile" ? getNextProfileQuestion(builder) : getNextBuildQuestion(selectedProject);

  const applyProfilePatch = (patch) => {
    if (patch.shortBio) {
      onUpdateBuilderField("shortBio", patch.shortBio);
    }
    if (patch.longerIntro) {
      onUpdateBuilderField("longerIntro", patch.longerIntro);
    }
    if (patch.featuredIntroLine) {
      onUpdateBuilderField("featuredIntroLine", patch.featuredIntroLine);
    }
    if (Array.isArray(patch.themes) && patch.themes.length) {
      onUpdateListField("themes", [...new Set([...(builder.themes ?? []), ...patch.themes])]);
    }
  };

  const applyBuildPatch = (patch) => {
    if (!selectedProject) {
      return;
    }

    Object.entries(patch).forEach(([field, value]) => {
      onUpdateProjectField(selectedProject.id, field, value);
    });
  };

  const submit = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await requestStudioTurn({
        history,
        userText: trimmed,
        stage: target === "profile" ? "profile-refine" : "build-refine",
        currentProject: target === "build" ? selectedProject : null,
        questionId: question.id,
      });

      if (response.builderPatch) {
        applyProfilePatch(response.builderPatch);
      }

      if (response.projectPatch) {
        applyBuildPatch(response.projectPatch);
      }

      setHistory((current) => [
        ...current,
        { role: "assistant", text: question.prompt },
        { role: "user", text: trimmed },
        { role: "assistant", text: response.reply || "Captured." },
      ]);
      setInput("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to talk to Chuckie right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="studio-panel">
      <div className="studio-panel-head">
        <div className="review-section-label">Refine With Chuckie</div>
        <h2>Optional, smaller questions</h2>
        <p>Chuckie is no longer the main workflow. Use him only when you want sharper framing for your profile or a specific build.</p>
      </div>

      <div className="studio-toggle-row">
        <button
          type="button"
          className={`taxonomy-pill${target === "profile" ? " taxonomy-pill-active" : ""}`}
          onClick={() => setTarget("profile")}
        >
          <span>◎</span>
          <strong>About You</strong>
        </button>
        <button
          type="button"
          className={`taxonomy-pill${target === "build" ? " taxonomy-pill-active" : ""}`}
          onClick={() => selectedProject && setTarget("build")}
          disabled={!selectedProject}
        >
          <span>◧</span>
          <strong>{selectedProject ? selectedProject.title : "Select a build first"}</strong>
        </button>
      </div>

      <div className="studio-question-card">
        <div className="review-section-label">{question.label}</div>
        <h3>{question.prompt}</h3>
      </div>

      <div className="studio-form-grid">
        <label className="studio-form-wide">
          Your answer
          <textarea
            rows="4"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Answer naturally. Chuckie will turn this into cleaner public-facing framing."
          />
        </label>
      </div>

      <div className="builder-composer-actions">
        <button type="button" className="solid-button builder-send-button" onClick={submit} disabled={!input.trim() || loading}>
          {loading ? "Sending..." : "Send to Chuckie"}
        </button>
      </div>

      {error ? <div className="studio-error">{error}</div> : null}

      <div className="studio-refine-history">
        {history.map((entry, index) => (
          <div
            key={`${entry.role}-${index}`}
            className={`studio-refine-line${entry.role === "user" ? " studio-refine-line-user" : ""}`}
          >
            <strong>{entry.role === "user" ? "You" : "Chuckie"}</strong>
            <p>{entry.text}</p>
          </div>
        ))}
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
  const [view, setView] = useState("profile");
  const [selectedProjectId, setSelectedProjectId] = useState(builder.projects[0]?.id ?? null);

  const selectedProject = getProjectEditorShape(
    builder.projects.find((project) => project.id === selectedProjectId) ?? builder.projects[0] ?? null,
  );

  const addBuild = () => {
    const projectId = onCreateProject(buildDraft());
    setSelectedProjectId(projectId);
    setView("build");
  };

  const buildCountLabel = useMemo(
    () => `${builder.projects.length} ${builder.projects.length === 1 ? "build" : "builds"}`,
    [builder.projects.length],
  );

  return (
    <div className="builder-workspace">
      <aside className="studio-sidebar">
        <div className="studio-sidebar-head">
          <div className="landing-eyebrow">Builder Studio</div>
          <strong>Build the rep from facts first</strong>
          <span>{buildCountLabel}</span>
        </div>

        <div className="studio-sidebar-section">
          <button
            type="button"
            className={`studio-nav-button${view === "profile" ? " studio-nav-button-active" : ""}`}
            onClick={() => setView("profile")}
          >
            About You
          </button>
          <button
            type="button"
            className={`studio-nav-button${view === "refine" ? " studio-nav-button-active" : ""}`}
            onClick={() => setView("refine")}
          >
            Refine with Chuckie
          </button>
        </div>

        <div className="studio-sidebar-section">
          <div className="studio-sidebar-label">Builds</div>
          <div className="studio-add-row">
            <button type="button" className="ghost-button" onClick={addBuild}>
              Add Agent/Project
            </button>
          </div>

          <div className="studio-build-list">
            {builder.projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`studio-build-card${selectedProject?.id === project.id && view === "build" ? " studio-build-card-active" : ""}`}
                onClick={() => {
                  setSelectedProjectId(project.id);
                  setView("build");
                }}
              >
                <div className="studio-build-card-top">
                  <span>{project.primaryType || "Build"}</span>
                  {project.featured ? <strong>Featured</strong> : null}
                </div>
                <h4>{project.title || "Untitled build"}</h4>
                <p>{project.shortDescription || "No description yet."}</p>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="studio-content">
        {view === "profile" ? (
          <BuilderProfileEditor
            builder={builder}
            onUpdateBuilderField={onUpdateBuilderField}
            onUpdateListField={onUpdateListField}
          />
        ) : view === "refine" ? (
          <ChuckieRefinePanel
            builder={builder}
            selectedProject={selectedProject}
            onUpdateBuilderField={onUpdateBuilderField}
            onUpdateListField={onUpdateListField}
            onUpdateProjectField={onUpdateProjectField}
          />
        ) : (
          <BuildEditor
            project={selectedProject}
            onUpdateProjectField={onUpdateProjectField}
            onToggleFeatured={onToggleFeatured}
          />
        )}
      </div>
    </div>
  );
}
