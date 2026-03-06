const CATEGORY_COLORS = {
  "public app": "#7c3aed",
  agent: "#2874a6",
  "strategy tool": "#b83280",
  "multi-agent system": "#b8860b",
  automation: "#1a8a7a",
  dashboard: "#1a8a7a",
  experiment: "#7c3aed",
  "internal tool": "#2d8a2e",
};

export function colorForProject(project) {
  return project.accentColor ?? CATEGORY_COLORS[project.category] ?? "#1a1a1a";
}

function CardVisual({ project }) {
  const color = colorForProject(project);
  const type = project.id;

  const visuals = {
    "camp-claw": (
      <svg viewBox="0 0 120 60" className="card-visual-svg">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((index) => (
          <rect
            key={index}
            x={10 + (index % 4) * 28}
            y={8 + Math.floor(index / 4) * 18}
            width="22"
            height="12"
            rx="2.5"
            fill={color}
            opacity={0.06 + index * 0.02}
          />
        ))}
        <path d="M15 50 L60 20 L105 50" stroke={color} strokeWidth="1.2" fill="none" opacity=".18" />
      </svg>
    ),
    holmes: (
      <svg viewBox="0 0 120 60" className="card-visual-svg">
        <circle cx="35" cy="30" r="18" fill="none" stroke={color} strokeWidth=".8" opacity=".15" />
        <circle cx="35" cy="30" r="10" fill={color} opacity=".06" />
        <line x1="50" y1="20" x2="110" y2="20" stroke={color} strokeWidth=".8" opacity=".12" />
        <line x1="50" y1="30" x2="95" y2="30" stroke={color} strokeWidth=".8" opacity=".1" />
        <line x1="50" y1="40" x2="105" y2="40" stroke={color} strokeWidth=".8" opacity=".08" />
      </svg>
    ),
    mycroft: (
      <svg viewBox="0 0 120 60" className="card-visual-svg">
        {[18, 42, 66, 90].map((x, index) => (
          <rect key={x} x={x} y="14" width="16" height="30" rx="2" fill={color} opacity={0.05 + index * 0.03} />
        ))}
      </svg>
    ),
    "openclaw-team": (
      <svg viewBox="0 0 120 60" className="card-visual-svg">
        {[20, 35, 50, 65, 80, 95].map((x, index) => (
          <circle key={x} cx={x} cy={index % 2 === 0 ? 24 : 36} r="3.5" fill={color} opacity={0.08 + index * 0.02} />
        ))}
      </svg>
    ),
    "sponsor-dashboard": (
      <svg viewBox="0 0 120 60" className="card-visual-svg">
        {[15, 30, 45, 60, 75, 90].map((x, index) => (
          <rect
            key={x}
            x={x}
            y={50 - (10 + index * 5 + (index % 2 ? 8 : 0))}
            width="8"
            height={10 + index * 5 + (index % 2 ? 8 : 0)}
            rx="1.5"
            fill={color}
            opacity={0.06 + index * 0.02}
          />
        ))}
      </svg>
    ),
    "aidb-new-year": (
      <svg viewBox="0 0 120 60" className="card-visual-svg">
        {[0, 1, 2, 3, 4].map((index) => (
          <circle
            key={index}
            cx={20 + index * 22}
            cy={30 + Math.sin(index * 1.2) * 10}
            r={4 + index * 1.5}
            fill={color}
            opacity={0.05 + index * 0.02}
          />
        ))}
        <text x="60" y="35" textAnchor="middle" fill={color} fontSize="14" opacity=".12" fontWeight="bold">
          2026
        </text>
      </svg>
    ),
    "mission-control": (
      <svg viewBox="0 0 120 60" className="card-visual-svg">
        <rect x="18" y="14" width="84" height="30" rx="4" fill={color} opacity=".05" />
        <line x1="28" y1="24" x2="92" y2="24" stroke={color} strokeWidth="1" opacity=".12" />
        <line x1="28" y1="32" x2="78" y2="32" stroke={color} strokeWidth="1" opacity=".1" />
      </svg>
    ),
  };

  return <div className="card-visual">{visuals[type] ?? null}</div>;
}

export function ShowcaseObject({ projects, onSelectProject }) {
  return (
    <div className="showcase-grid">
      {projects.map((project) => {
        const color = colorForProject(project);
        return (
          <button
            key={project.id}
            type="button"
            className="showcase-card"
            onClick={() => onSelectProject(project.id)}
            style={{ "--project-color": color }}
          >
            <CardVisual project={project} />
            <div className="showcase-content">
              <span className="tag-pill">{project.category}</span>
              <strong>{project.title}</strong>
              <p>{project.shortDescription}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ProjectDetailObject({ project, onLinkOut }) {
  const color = colorForProject(project);

  return (
    <div className="detail-card" style={{ "--project-color": color }}>
      <CardVisual project={project} />
      <div className="detail-header">
        <div className="detail-dot" />
        <h3>{project.title}</h3>
        <span className="tag-pill">{project.category}</span>
      </div>
      <p className="detail-blurb">{project.shortDescription}</p>
      <div className="detail-actions">
        <button type="button" className="solid-button" onClick={() => onLinkOut(project.id)} style={{ background: color }}>
          Go deeper →
        </button>
        <span>{new URL(project.primaryLink.url).hostname.replace(/^www\./, "")}</span>
      </div>
      <div className="deep-card">
        <div className="deep-header">
          <div className="detail-dot" />
          <h3>{project.title}</h3>
          <span className="tag-pill">{project.category}</span>
        </div>
        <p className="deep-overview">{project.longDescription}</p>
        <div className="deep-grid">
          <div>
            <label>What it is</label>
            <span>{project.whatItIs}</span>
          </div>
          <div>
            <label>Why it matters</label>
            <span>{project.whyItMatters}</span>
          </div>
          <div>
            <label>Status</label>
            <span>{project.status}</span>
          </div>
          <div>
            <label>Tools</label>
            <span>{project.tools.join(", ")}</span>
          </div>
        </div>
        <div className="deep-section-title" style={{ color }}>
          Why It's Here
        </div>
        <p className="deep-copy">{project.whatItDemonstrates}</p>
        <div className="screens-title">Screenshots</div>
        <div className="screen-placeholder" style={{ "--project-soft": `${color}10` }}>
          <span>{project.visuals[0]?.title ?? "Project visual"}</span>
        </div>
      </div>
    </div>
  );
}

export function ThinkingObject({ builder }) {
  const items = [
    {
      title: "Projects are the proof",
      text: "The work is represented through built systems and artifacts, not abstract claims.",
      color: "#2d8a2e",
    },
    {
      title: "Real beats described",
      text: "The experience should keep moving people toward live products, demos, and tangible outputs.",
      color: "#2874a6",
    },
    {
      title: "Why matters with what",
      text: "The strongest representation includes judgment, tradeoffs, and what a project says about the builder.",
      color: "#b83280",
    },
  ];

  return (
    <div className="principles-card">
      {items.map((item) => (
        <div key={item.title} className="principle-row">
          <span style={{ color: item.color }}>◇</span>
          <div>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
          </div>
        </div>
      ))}
      <div className="principles-footer">{builder.displayName}'s recurring patterns across projects.</div>
    </div>
  );
}

export function LinkOutObject({ project, link }) {
  const color = colorForProject(project);

  return (
    <div className="linkout-card" style={{ "--project-color": color }}>
      <div>
        <div className="linkout-label">Real thing</div>
        <h3>{link.title}</h3>
        <p>{link.description}</p>
      </div>
      <a className="solid-button" href={link.url} target="_blank" rel="noreferrer" style={{ background: color }}>
        Open link →
      </a>
    </div>
  );
}

export function BrowseProjectRow({ project, onOpen }) {
  const color = colorForProject(project);
  const browseSummary =
    {
      "camp-claw": "Free agent-building program",
      holmes: "AI Opportunity Partner",
      mycroft: "AI Strategy Builder",
      "openclaw-team": "Full orchestration system",
      "sponsor-dashboard": "Auto-reporting podcast metrics",
      "aidb-new-year": "Interactive community experience",
      "mission-control": "Agent operations interface",
    }[project.id] ?? project.shortDescription;

  return (
    <button
      type="button"
      className="browse-project-row"
      onClick={() => onOpen(project.id)}
      style={{ "--project-color": color }}
    >
      <div className="browse-project-main">
        <span className="browse-project-dot" />
        <strong>{project.title}</strong>
        <span className="browse-project-sub">{browseSummary}</span>
      </div>
      <div className="browse-project-visual">
        <CardVisual project={project} />
      </div>
      <div className="browse-project-meta">
        <span className="tag-pill">{project.category}</span>
        <span className="browse-project-chevron">▾</span>
      </div>
    </button>
  );
}
