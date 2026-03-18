"use client";

import { useMemo, useState } from "react";
import { BUILD_TYPES, CAPABILITY_MARKERS, FOCUS_AREAS } from "@/lib/build-taxonomy";

function buildDraft() {
  const title = "New Build";

  return {
    kind: "project",
    primaryType: "",
    buildProfileType: "",
    buildType: "",
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
      <div className="review-section-label">Links</div>
      <div className="studio-form-grid">
        <label>
          What is this link?
          <input
            value={project.primaryLink.title}
            onChange={(event) => updatePrimaryLink("title", event.target.value)}
            placeholder="Open Holmes"
          />
        </label>

        <label>
          Link URL
          <input
            value={project.primaryLink.url}
            onChange={(event) => updatePrimaryLink("url", event.target.value)}
            placeholder="https://example.com"
          />
        </label>

        <label className="studio-form-wide">
          Description
          <input
            value={project.primaryLink.description}
            onChange={(event) => updatePrimaryLink("description", event.target.value)}
            placeholder="Best place to send someone first"
          />
        </label>
      </div>

      <div className="studio-subsection-head">
        <strong>More links</strong>
        <button type="button" className="ghost-button" onClick={addSupportingLink}>
          Add another link
        </button>
      </div>

      <div className="studio-link-stack">
        {project.supportingLinks.map((link, index) => (
          <div key={`${project.id}-supporting-${index}`} className="studio-link-card">
            <div className="studio-form-grid">
              <label>
                What is this link?
                <input
                  value={link.title}
                  onChange={(event) => updateSupportingLink(index, "title", event.target.value)}
                />
              </label>
              <label>
                Link URL
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
          <p className="review-subcopy">Add screenshots people should see.</p>
        </div>
        <label className="ghost-button studio-upload-button">
          {uploading ? "Uploading..." : "Upload image"}
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
              What is shown?
              <input
                value={visual.title}
                onChange={(event) => updateVisual(index, "title", event.target.value)}
              />
            </label>
            <label>
              Optional note
              <input
                value={visual.description}
                onChange={(event) => updateVisual(index, "description", event.target.value)}
              />
            </label>
            <button type="button" className="builder-review-link" onClick={() => removeVisual(index)}>
              Delete image
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuildTypePicker({ project, onUpdateProjectField }) {
  const currentBuildType = project.buildProfileType || project.buildType || "";

  return (
    <div className="studio-section-block">
      <div className="review-section-label">Build Type</div>
      <p className="review-subcopy">Pick the closest match for what this build is.</p>
      <div className="taxonomy-grid">
        {BUILD_TYPES.map((type) => {
          const active = currentBuildType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              className={`taxonomy-pill${active ? " taxonomy-pill-active" : ""}`}
              onClick={() => onUpdateProjectField(project.id, "buildProfileType", type.id)}
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
    if (!project.focusAreas.includes(focusAreaId) && project.focusAreas.length >= 3) {
      return;
    }

    const nextFocusAreas = project.focusAreas.includes(focusAreaId)
      ? project.focusAreas.filter((item) => item !== focusAreaId)
      : [...project.focusAreas, focusAreaId];

    onUpdateProjectField(project.id, "focusAreas", nextFocusAreas);
  };

  return (
    <div className="studio-section-block">
      <div className="review-section-label">What It Does</div>
      <p className="review-subcopy">
        Choose up to three that best describe the work. {project.focusAreas.length}/3 selected.
      </p>
      <div className="focus-area-grid">
        {FOCUS_AREAS.map((area) => {
          const active = project.focusAreas.includes(area.id);
          const disabled = !active && project.focusAreas.length >= 3;
          return (
            <button
              key={area.id}
              type="button"
              className={`focus-area-pill${active ? " focus-area-pill-active" : ""}`}
              disabled={disabled}
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

function CapabilityMarkerPicker({ project, onUpdateProjectField }) {
  const isAgentBuild = project.buildType === "Agent" || project.buildProfileType === "Agent";

  const toggleCapabilityMarker = (markerId) => {
    if (!isAgentBuild) {
      return;
    }

    const nextCapabilities = project.capabilities.includes(markerId)
      ? project.capabilities.filter((item) => item !== markerId)
      : [...project.capabilities, markerId];

    onUpdateProjectField(project.id, "capabilities", nextCapabilities);
  };

  return (
    <div className="studio-section-block">
      <div className="review-section-label">Capability Markers</div>
      <p className="review-subcopy">
        {isAgentBuild
          ? `Tag the builder skills this agent build demonstrates. ${project.capabilities.length} selected.`
          : "Capability markers apply to Agent builds. Select Agent above to enable them."}
      </p>
      {isAgentBuild ? (
        <div className="focus-area-grid">
          {CAPABILITY_MARKERS.map((marker) => {
            const active = project.capabilities.includes(marker.id);
            return (
              <button
                key={marker.id}
                type="button"
                className={`focus-area-pill${active ? " focus-area-pill-active" : ""}`}
                onClick={() => toggleCapabilityMarker(marker.id)}
              >
                <span>{marker.icon}</span>
                <strong>{marker.label}</strong>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="studio-derived-card">
          <div className="review-subcopy">
            This tagging layer feeds the capability-marker portfolio map and only turns on for Agent
            builds.
          </div>
          {project.capabilities.length ? (
            <div className="review-subcopy">
              This build already has saved capability markers. They will reappear if you switch back
              to Agent.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function BuildEditor({ project, onDeleteProject, onUpdateProjectField }) {
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

  const confirmDelete = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Delete this build? This permanently removes it from your Agent Representative.",
      );

      if (!confirmed) {
        return;
      }
    }

    onDeleteProject(project.id);
  };

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

      <BuildTypePicker project={project} onUpdateProjectField={onUpdateProjectField} />
      <FocusAreaPicker project={project} onUpdateProjectField={onUpdateProjectField} />
      <CapabilityMarkerPicker project={project} onUpdateProjectField={onUpdateProjectField} />
      <LinkListEditor project={project} onUpdateProjectField={onUpdateProjectField} />
      <ScreenshotUploader project={project} onUpdateProjectField={onUpdateProjectField} />

      <div className="studio-section-block">
        <div className="review-section-label">What Chuckie Knows</div>
        <p className="review-subcopy">Use this for extra context Chuckie should remember about this build.</p>
        <div className="studio-form-grid">
          <label className="studio-form-wide">
            Notes
            <textarea
              rows="6"
              value={project.whatChuckieKnows}
              onChange={(event) => onUpdateProjectField(project.id, "whatChuckieKnows", event.target.value)}
              placeholder="What matters, what makes this interesting, and what Chuckie should remember."
            />
          </label>
        </div>
      </div>

      <div className="studio-section-block studio-danger-zone">
        <div className="review-section-label">Delete This Build</div>
        <p className="review-subcopy studio-danger-copy">
          This permanently removes this build from your Agent Representative. This action is final.
        </p>
        <button type="button" className="ghost-button studio-danger-button" onClick={confirmDelete}>
          Delete build
        </button>
      </div>
    </div>
  );
}

export default function BuilderSetup({
  builder,
  onUpdateBuilderField,
  onUpdateListField,
  onCreateProject,
  onDeleteProject = () => {},
  onUpdateProjectField,
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(builder.projects[0]?.id ?? null);

  const selectedProject = getProjectEditorShape(
    builder.projects.find((project) => project.id === selectedProjectId) ?? builder.projects[0] ?? null,
  );

  const addBuild = () => {
    const projectId = onCreateProject(buildDraft());
    setSelectedProjectId(projectId);
  };

  const deleteBuild = (projectId) => {
    const remainingProjects = builder.projects.filter((project) => project.id !== projectId);
    onDeleteProject(projectId);

    if (selectedProjectId === projectId) {
      setSelectedProjectId(remainingProjects[0]?.id ?? null);
    }
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
          <strong>Projects</strong>
          <span>{buildCountLabel}</span>
        </div>

        <div className="studio-sidebar-section">
          <div className="studio-sidebar-label">Projects</div>
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
                className={`studio-build-card${selectedProject?.id === project.id ? " studio-build-card-active" : ""}`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <div className="studio-build-card-top">
                  <span>{project.buildType || project.buildProfileType || "Build"}</span>
                </div>
                <h4>{project.title || "Untitled build"}</h4>
                <p>{project.shortDescription || "No description yet."}</p>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="studio-content">
        <BuildEditor
          project={selectedProject}
          onDeleteProject={deleteBuild}
          onUpdateProjectField={onUpdateProjectField}
        />
      </div>
    </div>
  );
}
