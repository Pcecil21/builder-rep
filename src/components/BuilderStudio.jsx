"use client";

import { useEffect, useMemo, useState } from "react";
import { BUILD_TYPES, CAPABILITY_MARKERS, FOCUS_AREAS } from "@/lib/build-taxonomy";
import {
  buildInterviewQuestion,
  buildKnowledgeGapPrompts,
  canEnterStudio,
  countAnsweredProfileFields,
  isBasicsComplete,
  isStudioReady,
  PROFILE_FIELD_LABELS,
  PROFILE_FIELD_ORDER,
  TOOL_OPTIONS,
} from "@/lib/builder-profile";
import { requestStudioTurn } from "@/src/lib/api";

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

function BasicsStep({
  builder,
  onToggleTool,
  onGithubProfileChange,
  onGithubReposChange,
  onContinue,
}) {
  return (
    <div className="studio-panel">
      <div className="studio-panel-head">
        <div className="review-section-label">Step 1</div>
        <h2>Structured Basics</h2>
        <p>Give Chuckie enough context to open with smarter questions instead of generic prompts.</p>
      </div>

      <ToolBucket
        title="Tools You Use Regularly"
        helper="Pick the tools that are actually in your working stack right now."
        selected={builder.toolStack.regular}
        onToggle={(tool) => onToggleTool("regular", tool)}
      />

      <ToolBucket
        title="Tools You're Familiar With"
        helper="Use this for tools you can work with, even if they are not core to your current stack."
        selected={builder.toolStack.familiar}
        onToggle={(tool) => onToggleTool("familiar", tool)}
      />

      <div className="studio-section-block">
        <div className="review-section-label">GitHub Context</div>
        <p className="review-subcopy">
          First pass: paste your GitHub profile and any repos Chuckie should know about now.
        </p>
        <div className="studio-form-grid">
          <label className="studio-form-wide">
            GitHub Profile URL
            <input
              value={builder.github.profileUrl}
              onChange={(event) => onGithubProfileChange(event.target.value)}
              placeholder="https://github.com/your-handle"
            />
          </label>

          <label className="studio-form-wide">
            Repo URLs to Start With
            <textarea
              rows="4"
              value={builder.github.repoUrls.join("\n")}
              onChange={(event) => onGithubReposChange(event.target.value)}
              placeholder={"https://github.com/you/project-one\nhttps://github.com/you/project-two"}
            />
          </label>
        </div>
      </div>

      <div className="builder-composer-actions">
        <button type="button" className="solid-button builder-send-button" onClick={onContinue}>
          Continue to Interview
        </button>
      </div>
    </div>
  );
}

function ProfileSnapshot({ builder, onUpdateBuilder }) {
  const updateProfileField = (field, value) => {
    onUpdateBuilder((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value,
      },
    }));
  };

  return (
    <div className="studio-panel">
      <div className="studio-panel-head">
        <div className="review-section-label">Profile Preview</div>
        <h2>Live Builder Profile</h2>
        <p>Chuckie updates this as you work. You can review and edit it anytime.</p>
      </div>

      <div className="studio-derived-card">
        <div className="studio-derived-row studio-derived-row-stack">
          <span>Live Public Intro</span>
          <strong>{builder.featuredIntroLine}</strong>
        </div>
        <div className="studio-derived-row studio-derived-row-stack">
          <span>Public Bio</span>
          <strong>{builder.shortBio}</strong>
        </div>
        <div className="studio-derived-row studio-derived-row-stack">
          <span>Regular Tools</span>
          <div className="studio-derived-tags">
            {builder.toolStack.regular.length ? (
              builder.toolStack.regular.map((tool) => <strong key={tool}>{tool}</strong>)
            ) : (
              <span>Still empty.</span>
            )}
          </div>
        </div>
        {builder.github.profileUrl ? (
          <div className="studio-derived-row studio-derived-row-stack">
            <span>GitHub</span>
            <strong>{builder.github.profileUrl}</strong>
          </div>
        ) : null}
      </div>

      <div className="studio-form-grid">
        {PROFILE_FIELD_ORDER.map((field) => (
          <label key={field} className="studio-form-wide">
            {PROFILE_FIELD_LABELS[field]}
            <textarea
              rows={field === "builderPhilosophy" || field === "background" ? 4 : 3}
              value={builder.profile[field]}
              onChange={(event) => updateProfileField(field, event.target.value)}
              placeholder={`Add ${PROFILE_FIELD_LABELS[field].toLowerCase()}.`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function InterviewStep({ builder, onUpdateBuilder, onSkipToProjects, onEnterStudio }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusField, setFocusField] = useState(PROFILE_FIELD_ORDER[0]);

  const answeredCount = countAnsweredProfileFields(builder.profile);

  useEffect(() => {
    const nextField = PROFILE_FIELD_ORDER.find((field) => !builder.profile[field]) ?? PROFILE_FIELD_ORDER[0];
    setFocusField((current) => (builder.profile[current] ? nextField : current || nextField));
  }, [builder.profile]);

  useEffect(() => {
    if (!history.length && isBasicsComplete(builder)) {
      const nextField = PROFILE_FIELD_ORDER.find((field) => !builder.profile[field]) ?? PROFILE_FIELD_ORDER[0];
      setFocusField(nextField);
      setHistory([{ role: "assistant", text: buildInterviewQuestion(nextField, builder) }]);
    }
  }, [builder, history.length]);

  const selectFocusField = (field) => {
    setFocusField(field);
    setHistory([{ role: "assistant", text: buildInterviewQuestion(field, builder) }]);
    setError("");
    setInput("");
  };

  const submit = async () => {
    const trimmed = input.trim();

    if (!trimmed || loading) {
      return;
    }

    const activeField = focusField;
    setLoading(true);
    setError("");
    setInput("");
    setHistory((current) => [...current, { role: "user", text: trimmed }]);

    try {
      const response = await requestStudioTurn({
        history,
        userText: trimmed,
        stage: "onboarding-interview",
        focusField: activeField,
      });

      const nextField = response.nextFocusField || activeField;
      const fieldToUpdate = response.profileField || activeField;

      onUpdateBuilder((current) => ({
        ...current,
        profile: {
          ...current.profile,
          [fieldToUpdate]: response.fieldValue || trimmed,
        },
        onboarding: {
          ...current.onboarding,
          currentStep: "interview",
          interviewResponses: Math.max(current.onboarding.interviewResponses, answeredCount + 1),
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
    <div className="studio-panel">
      <div className="studio-panel-head">
        <div className="review-section-label">Step 2</div>
        <h2>Adaptive Interview</h2>
        <p>Chuckie is pulling signal out of your story and updating the profile in real time.</p>
      </div>

      <div className="studio-section-block">
        <div className="review-section-label">Coverage</div>
        <p className="review-subcopy">
          {answeredCount}/{PROFILE_FIELD_ORDER.length} core areas captured so far.
        </p>
        <div className="focus-area-grid">
          {PROFILE_FIELD_ORDER.map((field) => {
            const answered = Boolean(builder.profile[field]);
            const active = field === focusField;
            return (
              <button
                key={field}
                type="button"
                className={`focus-area-pill${active || answered ? " focus-area-pill-active" : ""}`}
                onClick={() => selectFocusField(field)}
              >
                <strong>{PROFILE_FIELD_LABELS[field]}</strong>
              </button>
            );
          })}
        </div>
      </div>

      <div className="studio-chat-surface">
        <div className="builder-conversation">
          {history.map((entry, index) =>
            entry.role === "user" ? (
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
          {loading ? (
            <div className="builder-line builder-line-chuckie">
              <div className="builder-avatar">◎</div>
              <p>Thinking...</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="builder-composer">
        <textarea
          rows="4"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Answer in as much detail as you want. Chuckie will keep pulling on the interesting threads."
        />
        <div className="builder-composer-actions">
          <button type="button" className="solid-button builder-send-button" onClick={submit} disabled={!input.trim() || loading}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      <div className="builder-composer-actions builder-composer-actions-split">
        <button type="button" className="ghost-button" onClick={onSkipToProjects}>
          Skip to Project Entry
        </button>
        {canEnterStudio(builder) ? (
          <button type="button" className="solid-button builder-send-button" onClick={onEnterStudio}>
            Enter Studio
          </button>
        ) : null}
      </div>

      {error ? <div className="studio-error">{error}</div> : null}
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
            This tagging layer feeds the capability-marker portfolio map and only turns on for Agent builds.
          </div>
          {project.capabilities.length ? (
            <div className="review-subcopy">
              This build already has saved capability markers. They will reappear if you switch back to Agent.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function BuildEditor({ builder, project, onDeleteProject, onUpdateProjectField }) {
  if (!project) {
    return (
      <div className="studio-panel">
        <div className="studio-panel-head">
          <div className="review-section-label">Build Editor</div>
          <h2>Add your first build</h2>
          <p>Use structured fields for the facts, then add the context Chuckie should remember.</p>
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
        <div className="review-section-label">Build Entry</div>
        <h2>{project.title || "Untitled Build"}</h2>
        <p>Chuckie will get smarter from the form first, then from the context you add around it.</p>
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

        <label>
          GitHub Repo URL
          <input
            value={project.githubRepoUrl}
            onChange={(event) => onUpdateProjectField(project.id, "githubRepoUrl", event.target.value)}
            placeholder="https://github.com/you/project"
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

      {builder.github.profileUrl ? (
        <div className="studio-derived-card">
          <div className="studio-derived-row studio-derived-row-stack">
            <span>Connected GitHub Profile</span>
            <strong>{builder.github.profileUrl}</strong>
          </div>
        </div>
      ) : null}

      <BuildTypePicker project={project} onUpdateProjectField={onUpdateProjectField} />
      <FocusAreaPicker project={project} onUpdateProjectField={onUpdateProjectField} />
      <CapabilityMarkerPicker project={project} onUpdateProjectField={onUpdateProjectField} />
      <LinkListEditor project={project} onUpdateProjectField={onUpdateProjectField} />
      <ScreenshotUploader project={project} onUpdateProjectField={onUpdateProjectField} />

      <div className="studio-section-block">
        <div className="review-section-label">Tell Chuckie More About This Build</div>
        <p className="review-subcopy">
          Use this for the context the form will never ask for: why it mattered, what was hard, what you would do differently.
        </p>
        <div className="studio-form-grid">
          <label className="studio-form-wide">
            Context for Chuckie
            <textarea
              rows="6"
              value={project.whatChuckieKnows}
              onChange={(event) => onUpdateProjectField(project.id, "whatChuckieKnows", event.target.value)}
              placeholder="What should Chuckie remember when someone asks about this project later?"
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

function BuildCollection({
  builder,
  selectedProjectId,
  setSelectedProjectId,
  onCreateProject,
  onDeleteProject,
  onUpdateProjectField,
  showEnterStudio = false,
  onEnterStudio,
}) {
  const selectedProject = getProjectEditorShape(
    builder.projects.find((project) => project.id === selectedProjectId) ?? builder.projects[0] ?? null,
  );

  const addBuild = () => {
    const projectId = onCreateProject(buildDraft());
    setSelectedProjectId(projectId);
  };

  return (
    <div className="studio-panel">
      <div className="studio-panel-head">
        <div className="review-section-label">Step 3</div>
        <h2>Project / Build Entry</h2>
        <p>Forms for the structured facts. Chuckie context for the interesting stuff.</p>
      </div>

      <div className="studio-add-row">
        <button type="button" className="ghost-button" onClick={addBuild}>
          Add Build
        </button>
        {showEnterStudio ? (
          <button type="button" className="solid-button builder-send-button" onClick={onEnterStudio}>
            Enter Studio
          </button>
        ) : null}
      </div>

      {builder.projects.length ? (
        <>
          <div className="studio-build-list studio-build-list-inline">
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

          <BuildEditor
            builder={builder}
            project={selectedProject}
            onDeleteProject={onDeleteProject}
            onUpdateProjectField={onUpdateProjectField}
          />
        </>
      ) : (
        <div className="studio-derived-card">
          <div className="studio-derived-row studio-derived-row-stack">
            <span>Start with one build</span>
            <strong>Add a project, tag it, and give Chuckie enough context to talk about it well.</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function ChuckieStudioPanel({ builder, onUpdateBuilder, onUpdateProjectField }) {
  const [target, setTarget] = useState("profile");
  const [selectedBuildId, setSelectedBuildId] = useState(builder.projects[0]?.id ?? "");
  const [activePromptId, setActivePromptId] = useState("");
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const prompts = useMemo(() => buildKnowledgeGapPrompts(builder), [builder]);
  const activeProject = getProjectEditorShape(
    builder.projects.find((project) => project.id === selectedBuildId) ?? builder.projects[0] ?? null,
  );

  const filteredPrompts = prompts.filter((prompt) =>
    target === "profile" ? prompt.target === "profile" : prompt.target === "build",
  );

  useEffect(() => {
    if (!selectedBuildId && builder.projects[0]?.id) {
      setSelectedBuildId(builder.projects[0].id);
    }
  }, [builder.projects, selectedBuildId]);

  useEffect(() => {
    const fallbackPrompt = filteredPrompts.find((prompt) =>
      target === "build" ? prompt.projectId === (activeProject?.id ?? "") || !prompt.projectId : true,
    );

    if (!fallbackPrompt) {
      setActivePromptId("");
      setHistory([]);
      return;
    }

    if (!filteredPrompts.some((prompt) => prompt.id === activePromptId)) {
      setActivePromptId(fallbackPrompt.id);
      setHistory([{ role: "assistant", text: fallbackPrompt.prompt }]);
      setError("");
    }
  }, [activePromptId, activeProject?.id, filteredPrompts, target]);

  const activatePrompt = (prompt) => {
    setTarget(prompt.target === "build" ? "build" : "profile");
    if (prompt.projectId) {
      setSelectedBuildId(prompt.projectId);
    }
    setActivePromptId(prompt.id);
    setHistory([{ role: "assistant", text: prompt.prompt }]);
    setInput("");
    setError("");
  };

  const submit = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    const activePrompt = prompts.find((prompt) => prompt.id === activePromptId) ?? null;
    const currentTarget = activePrompt?.target ?? target;

    setLoading(true);
    setError("");
    setInput("");
    setHistory((current) => [...current, { role: "user", text: trimmed }]);

    try {
      if (currentTarget === "profile") {
        const focusField = activePrompt?.focusField ?? PROFILE_FIELD_ORDER[0];
        const response = await requestStudioTurn({
          history,
          userText: trimmed,
          stage: "onboarding-interview",
          focusField,
        });

        onUpdateBuilder((current) => ({
          ...current,
          profile: {
            ...current.profile,
            [response.profileField || focusField]: response.fieldValue || trimmed,
          },
          onboarding: {
            ...current.onboarding,
            interviewResponses: Math.max(current.onboarding.interviewResponses, countAnsweredProfileFields(current.profile) + 1),
          },
        }));

        setHistory((current) => [...current, { role: "assistant", text: response.reply || "Captured." }]);
      } else if (activeProject) {
        const response = await requestStudioTurn({
          history,
          userText: trimmed,
          stage: "build-refine",
          currentProject: activeProject,
        });

        onUpdateProjectField(
          activeProject.id,
          "whatChuckieKnows",
          appendKnowledge(activeProject.whatChuckieKnows, response.knowledgeNote || trimmed),
        );

        setHistory((current) => [...current, { role: "assistant", text: response.reply || "Captured." }]);
      }
    } catch (submitError) {
      setHistory((current) => current.slice(0, -1));
      setInput(trimmed);
      setError(submitError instanceof Error ? submitError.message : "Unable to talk to Chuckie right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="studio-panel">
      <div className="studio-panel-head">
        <div className="review-section-label">Step 4</div>
        <h2>Ongoing Conversational Enrichment</h2>
        <p>Chuckie keeps surfacing what it still does not know, then folds that context back into your profile and builds.</p>
      </div>

      <div className="studio-toggle-row">
        <button
          type="button"
          className={`taxonomy-pill${target === "profile" ? " taxonomy-pill-active" : ""}`}
          onClick={() => setTarget("profile")}
        >
          <span>◎</span>
          <strong>Background</strong>
        </button>
        <button
          type="button"
          className={`taxonomy-pill${target === "build" ? " taxonomy-pill-active" : ""}`}
          onClick={() => activeProject && setTarget("build")}
          disabled={!activeProject}
        >
          <span>◧</span>
          <strong>Builds</strong>
        </button>
      </div>

      {target === "build" ? (
        <div className="studio-form-grid">
          <label className="studio-form-wide">
            Which build?
            <select
              className="review-select"
              value={activeProject?.id ?? ""}
              onChange={(event) => setSelectedBuildId(event.target.value)}
            >
              {builder.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title || "Untitled build"}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="studio-section-block">
        <div className="review-section-label">Chuckie Wants To Know</div>
        <div className="focus-area-grid">
          {filteredPrompts.map((prompt) => {
            const active = prompt.id === activePromptId;
            return (
              <button
                key={prompt.id}
                type="button"
                className={`focus-area-pill${active ? " focus-area-pill-active" : ""}`}
                onClick={() => activatePrompt(prompt)}
              >
                <strong>{prompt.label}</strong>
              </button>
            );
          })}
        </div>
      </div>

      <div className="studio-chat-surface">
        <div className="builder-conversation">
          {history.map((entry, index) =>
            entry.role === "user" ? (
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
          {loading ? (
            <div className="builder-line builder-line-chuckie">
              <div className="builder-avatar">◎</div>
              <p>Thinking...</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="builder-composer">
        <textarea
          rows="4"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            target === "profile"
              ? "Tell Chuckie more about your background, how you work, or what you want to be known for."
              : "Tell Chuckie more about this build, what was hard, or why it matters."
          }
        />
        <div className="builder-composer-actions">
          <button type="button" className="solid-button builder-send-button" onClick={submit} disabled={!input.trim() || loading}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      {error ? <div className="studio-error">{error}</div> : null}
    </div>
  );
}

function OnboardingWorkspace({
  builder,
  onUpdateBuilder,
  onCreateProject,
  onDeleteProject,
  onUpdateProjectField,
  selectedProjectId,
  setSelectedProjectId,
}) {
  const [tab, setTab] = useState("onboarding");
  const [step, setStep] = useState(builder.onboarding.currentStep || "basics");

  useEffect(() => {
    setStep(builder.onboarding.currentStep || "basics");
  }, [builder.onboarding.currentStep]);

  const goToStep = (nextStep) => {
    setStep(nextStep);
    onUpdateBuilder((current) => ({
      ...current,
      onboarding: {
        ...current.onboarding,
        currentStep: nextStep,
      },
    }));
  };

  const enterStudio = () => {
    onUpdateBuilder((current) => ({
      ...current,
      onboarding: {
        ...current.onboarding,
        studioReady: true,
        currentStep: current.onboarding.currentStep === "basics" ? "interview" : current.onboarding.currentStep,
      },
    }));
  };

  const skipToProjects = () => {
    if (!builder.projects.length) {
      const nextId = onCreateProject(buildDraft());
      setSelectedProjectId(nextId);
    }

    onUpdateBuilder((current) => ({
      ...current,
      onboarding: {
        ...current.onboarding,
        skippedToProjects: true,
        currentStep: "projects",
      },
    }));
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

  const steps = [
    {
      id: "basics",
      label: "Structured Basics",
      completed: isBasicsComplete(builder),
    },
    {
      id: "interview",
      label: "Adaptive Interview",
      completed: countAnsweredProfileFields(builder.profile) > 0,
    },
    {
      id: "projects",
      label: "Build Entry",
      completed: builder.projects.length > 0,
    },
    {
      id: "enrich",
      label: "Ongoing Chuckie",
      completed: false,
    },
  ];

  return (
    <div className="builder-layout">
      <aside className="builder-stepper">
        {steps.map((item) => {
          const active = step === item.id;
          const className = active
            ? "builder-step builder-step-active"
            : item.completed
              ? "builder-step builder-step-completed"
              : "builder-step builder-step-upcoming";

          return (
            <button key={item.id} type="button" className={className} onClick={() => item.id !== "enrich" && goToStep(item.id)}>
              <span className="builder-step-marker" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </aside>

      <div className="builder-interview">
        <div className="studio-shell-tabs">
          <button
            type="button"
            className={`studio-shell-tab${tab === "onboarding" ? " studio-shell-tab-active" : ""}`}
            onClick={() => setTab("onboarding")}
          >
            Onboarding
          </button>
          <button
            type="button"
            className={`studio-shell-tab${tab === "profile" ? " studio-shell-tab-active" : ""}`}
            onClick={() => setTab("profile")}
          >
            Profile Preview
          </button>
        </div>

        {tab === "profile" ? (
          <ProfileSnapshot builder={builder} onUpdateBuilder={onUpdateBuilder} />
        ) : step === "basics" ? (
          <BasicsStep
            builder={builder}
            onToggleTool={toggleTool}
            onGithubProfileChange={(value) =>
              onUpdateBuilder((current) => ({
                ...current,
                github: {
                  ...current.github,
                  profileUrl: value,
                },
              }))
            }
            onGithubReposChange={(value) =>
              onUpdateBuilder((current) => ({
                ...current,
                github: {
                  ...current.github,
                  repoUrls: value
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                },
                onboarding: {
                  ...current.onboarding,
                  currentStep: "basics",
                },
              }))
            }
            onContinue={() => goToStep("interview")}
          />
        ) : step === "interview" ? (
          <InterviewStep
            builder={builder}
            onUpdateBuilder={onUpdateBuilder}
            onSkipToProjects={skipToProjects}
            onEnterStudio={enterStudio}
          />
        ) : (
          <BuildCollection
            builder={builder}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            onCreateProject={onCreateProject}
            onDeleteProject={onDeleteProject}
            onUpdateProjectField={onUpdateProjectField}
            showEnterStudio={canEnterStudio(builder)}
            onEnterStudio={enterStudio}
          />
        )}
      </div>
    </div>
  );
}

function StudioWorkspace({
  builder,
  onUpdateBuilder,
  onCreateProject,
  onDeleteProject,
  onUpdateProjectField,
  selectedProjectId,
  setSelectedProjectId,
}) {
  const [view, setView] = useState(
    builder.onboarding.currentStep === "projects" || builder.onboarding.skippedToProjects ? "builds" : "profile",
  );

  useEffect(() => {
    if (view === "builds" && !builder.projects.length) {
      setSelectedProjectId(null);
    }
  }, [builder.projects, setSelectedProjectId, view]);

  const selectedProject = getProjectEditorShape(
    builder.projects.find((project) => project.id === selectedProjectId) ?? builder.projects[0] ?? null,
  );

  const addBuild = () => {
    const projectId = onCreateProject(buildDraft());
    setSelectedProjectId(projectId);
    setView("builds");
  };

  return (
    <div className="builder-workspace">
      <aside className="studio-sidebar">
        <div className="studio-sidebar-head">
          <div className="landing-eyebrow">Builder Studio</div>
          <strong>Keep Teaching Chuckie</strong>
          <span>{builder.projects.length} builds</span>
        </div>

        <div className="studio-sidebar-section">
          <div className="studio-sidebar-label">Studio</div>
          <button
            type="button"
            className={`studio-nav-button${view === "profile" ? " studio-nav-button-active" : ""}`}
            onClick={() => setView("profile")}
          >
            Profile
          </button>
          <button
            type="button"
            className={`studio-nav-button${view === "chuckie" ? " studio-nav-button-active" : ""}`}
            onClick={() => setView("chuckie")}
          >
            Talk to Chuckie
          </button>
          <button
            type="button"
            className={`studio-nav-button${view === "builds" ? " studio-nav-button-active" : ""}`}
            onClick={() => setView("builds")}
          >
            Builds
          </button>
        </div>

        <div className="studio-sidebar-section">
          <div className="studio-sidebar-label">Builds</div>
          <div className="studio-add-row">
            <button type="button" className="ghost-button" onClick={addBuild}>
              Add Build
            </button>
          </div>

          <div className="studio-build-list">
            {builder.projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`studio-build-card${selectedProject?.id === project.id && view === "builds" ? " studio-build-card-active" : ""}`}
                onClick={() => {
                  setSelectedProjectId(project.id);
                  setView("builds");
                }}
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
        {view === "profile" ? (
          <ProfileSnapshot builder={builder} onUpdateBuilder={onUpdateBuilder} />
        ) : view === "chuckie" ? (
          <ChuckieStudioPanel
            builder={builder}
            onUpdateBuilder={onUpdateBuilder}
            onUpdateProjectField={onUpdateProjectField}
          />
        ) : (
          <BuildEditor
            builder={builder}
            project={selectedProject}
            onDeleteProject={onDeleteProject}
            onUpdateProjectField={onUpdateProjectField}
          />
        )}
      </div>
    </div>
  );
}

export default function BuilderStudio({
  builder,
  onUpdateBuilder,
  onCreateProject,
  onDeleteProject,
  onUpdateProjectField,
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(builder.projects[0]?.id ?? null);

  useEffect(() => {
    if (!selectedProjectId && builder.projects[0]?.id) {
      setSelectedProjectId(builder.projects[0].id);
      return;
    }

    if (selectedProjectId && !builder.projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(builder.projects[0]?.id ?? null);
    }
  }, [builder.projects, selectedProjectId]);

  if (!isStudioReady(builder)) {
    return (
      <OnboardingWorkspace
        builder={builder}
        onUpdateBuilder={onUpdateBuilder}
        onCreateProject={onCreateProject}
        onDeleteProject={onDeleteProject}
        onUpdateProjectField={onUpdateProjectField}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
      />
    );
  }

  return (
    <StudioWorkspace
      builder={builder}
      onUpdateBuilder={onUpdateBuilder}
      onCreateProject={onCreateProject}
      onDeleteProject={onDeleteProject}
      onUpdateProjectField={onUpdateProjectField}
      selectedProjectId={selectedProjectId}
      setSelectedProjectId={setSelectedProjectId}
    />
  );
}
