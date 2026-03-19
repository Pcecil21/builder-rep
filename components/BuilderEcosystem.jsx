"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FOCUS_AREAS, getFocusAreaProjects } from "@/lib/build-taxonomy";
import {
  getAxisById,
  getPortfolioPathForSlug,
  getRadarProjects,
  getVisibleCapabilities,
  RADAR_AXES,
  RADAR_BUILD_TYPE_STYLES,
} from "@/lib/radar";

function countToPercent(count) {
  if (count <= 0) return 0;
  if (count === 1) return 28;
  if (count === 2) return 55;
  if (count === 3) return 80;
  return 100;
}

function toBuild(project) {
  const capabilities = getVisibleCapabilities(project);

  return {
    id: project.id,
    name: project.title,
    type: project.buildType,
    desc: project.shortDescription,
    detail: project.longDescription || project.whatItIs || project.whyItMatters,
    capabilities,
    mini: getAxisById(capabilities[0])?.icon ?? "◎",
  };
}

function Radar({ builds, highlightedAxes, onHoverAxis, size = 260 }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34;
  const step = (2 * Math.PI) / RADAR_AXES.length;
  const start = -Math.PI / 2;

  const pointFor = (angle, radialValue) => ({
    x: cx + radialValue * Math.cos(angle),
    y: cy + radialValue * Math.sin(angle),
  });

  const values = RADAR_AXES.map((axis) => {
    const count = builds.filter((build) => build.capabilities.includes(axis.id)).length;
    return countToPercent(count);
  });

  const points = values.map((value, index) => pointFor(start + index * step, (value / 100) * radius));
  const pathD = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ") + " Z";
  const hasData = values.some((value) => value > 0);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ecosystem-radar">
      <defs>
        <radialGradient id="ecosystem-rFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0.03" />
        </radialGradient>
      </defs>

      {[0.33, 0.66, 1].map((level) => {
        const ring = RADAR_AXES.map((_, index) => pointFor(start + index * step, radius * level));
        return (
          <path
            key={level}
            d={ring.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ") + " Z"}
            fill="none"
            stroke="#ECEAF3"
            strokeWidth={0.8}
          />
        );
      })}

      {RADAR_AXES.map((_, index) => {
        const end = pointFor(start + index * step, radius);
        return <line key={index} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#ECEAF3" strokeWidth={0.5} />;
      })}

      {hasData ? (
        <>
          <path
            d={pathD}
            fill="url(#ecosystem-rFill)"
            stroke="#7C5CFC"
            strokeWidth={2}
            strokeLinejoin="round"
            style={{ transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
          {points.map((point, index) =>
            values[index] > 0 ? (
              <circle
                key={RADAR_AXES[index].id}
                cx={point.x}
                cy={point.y}
                r={3.5}
                fill={highlightedAxes.includes(RADAR_AXES[index].id) ? "#7C5CFC" : "#fff"}
                stroke="#7C5CFC"
                strokeWidth={2}
                style={{ transition: "all 0.3s ease" }}
              />
            ) : null,
          )}
        </>
      ) : null}

      {RADAR_AXES.map((axis, index) => {
        const labelPoint = pointFor(start + index * step, radius + 28);
        const count = builds.filter((build) => build.capabilities.includes(axis.id)).length;
        const highlighted = highlightedAxes.includes(axis.id);

        return (
          <g
            key={axis.id}
            className="ecosystem-axis-group"
            onMouseEnter={() => onHoverAxis(axis.id)}
            onMouseLeave={() => onHoverAxis(null)}
          >
            <text x={labelPoint.x} y={labelPoint.y - 6} textAnchor="middle" className="ecosystem-axis-icon">
              {axis.icon}
            </text>
            <text
              x={labelPoint.x}
              y={labelPoint.y + 9}
              textAnchor="middle"
              className={`ecosystem-axis-label${highlighted ? " ecosystem-axis-label-active" : ""}${
                count === 0 ? " ecosystem-axis-label-empty" : ""
              }`}
            >
              {axis.short}
            </text>
            {count > 1 ? (
              <text x={labelPoint.x} y={labelPoint.y + 20} textAnchor="middle" className="ecosystem-axis-count">
                x{count}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function BuildPill({ build, highlighted, onHover, onSelect }) {
  const typeStyle = RADAR_BUILD_TYPE_STYLES[build.type] ?? RADAR_BUILD_TYPE_STYLES.Agent;

  return (
    <button
      type="button"
      className={`ecosystem-build-pill${highlighted ? " ecosystem-build-pill-active" : ""}`}
      style={{
        "--ecosystem-pill-bg": highlighted ? typeStyle.bg : "#FAFAFA",
        "--ecosystem-pill-border": highlighted ? typeStyle.border : "#EEEDF2",
        "--ecosystem-pill-type-bg": typeStyle.bg,
        "--ecosystem-pill-type-text": typeStyle.text,
        "--ecosystem-pill-type-border": typeStyle.border,
      }}
      onMouseEnter={() => onHover(build.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(build.id)}
    >
      <span className="ecosystem-build-mini">{build.mini}</span>
      <div className="ecosystem-build-copy">
        <div className="ecosystem-build-name">{build.name}</div>
        <div className="ecosystem-build-desc">{build.desc}</div>
      </div>
      <span className="ecosystem-build-type">{build.type}</span>
    </button>
  );
}

function BuildDetail({ build, surface, slug, onClose, onOpenProject }) {
  const typeStyle = RADAR_BUILD_TYPE_STYLES[build.type] ?? RADAR_BUILD_TYPE_STYLES.Agent;

  return (
    <div className="ecosystem-build-detail" style={{ "--ecosystem-detail-border": typeStyle.border }}>
      <div className="ecosystem-build-detail-head">
        <div className="ecosystem-build-detail-identity">
          <span className="ecosystem-build-detail-mini">{build.mini}</span>
          <div>
            <div className="ecosystem-build-detail-name">{build.name}</div>
            <div className="ecosystem-build-detail-desc">{build.desc}</div>
          </div>
        </div>
        <button type="button" className="ecosystem-build-detail-close" onClick={onClose}>
          x
        </button>
      </div>

      <div className="ecosystem-build-detail-copy">{build.detail}</div>

      {build.capabilities.length ? (
        <div className="ecosystem-capability-row">
          {build.capabilities.map((capabilityId) => {
            const axis = getAxisById(capabilityId);
            return (
              <span key={capabilityId} className="ecosystem-capability-tag">
                {axis?.icon} {axis?.short}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="ecosystem-capability-empty">
          {build.type === "Agent"
            ? "No capability markers tagged yet."
            : "Capability markers only appear on agent builds."}
        </div>
      )}

      <div className="ecosystem-build-detail-actions">
        {surface === "chat" ? (
          <Link href={getPortfolioPathForSlug(slug)} className="ecosystem-inline-link">
            Open full portfolio
          </Link>
        ) : (
          <button type="button" className="ecosystem-inline-link ecosystem-inline-button" onClick={() => onOpenProject?.(build.id)}>
            Open project details
          </button>
        )}
      </div>
    </div>
  );
}

function FocusAreaGrid({ builder, onOpenProject }) {
  const focusMap = useMemo(() => getFocusAreaProjects(builder), [builder]);
  const activeAreas = FOCUS_AREAS.filter((area) => focusMap[area.id]?.length > 0);

  if (!activeAreas.length) {
    return (
      <div className="ecosystem-empty">
        <p>No builds have been tagged with focus areas yet.</p>
      </div>
    );
  }

  return (
    <div className="ecosystem-focus-grid">
      {activeAreas.map((area) => {
        const projects = focusMap[area.id];
        return (
          <div key={area.id} className="ecosystem-focus-card">
            <div className="ecosystem-focus-card-head">
              <span className="ecosystem-focus-icon">{area.icon}</span>
              <span className="ecosystem-focus-label">{area.label}</span>
              <span className="ecosystem-focus-count">{projects.length}</span>
            </div>
            <div className="ecosystem-focus-projects">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="ecosystem-focus-project"
                  onClick={() => onOpenProject?.(project.id)}
                >
                  <strong>{project.title}</strong>
                  <span>{project.shortDescription}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const MODE_META = {
  "capability-markers": {
    kicker: "Capability Marker Map",
    emptyTitle: "No mapped builds yet",
    emptyCopy:
      "Tag a project with a build type to make the portfolio map appear. Agent builds can then be tagged with capability markers.",
    subtitle: (buildCount, coveredCount) =>
      `${buildCount} typed ${buildCount === 1 ? "build" : "builds"} across ${coveredCount} capability markers`,
    insightEmpty: "No capability markers tagged yet. Agent builds will shape this map once markers are selected.",
  },
  "what-it-does": {
    kicker: "What It Does",
    emptyTitle: "No focus areas tagged yet",
    emptyCopy:
      "Tag builds with focus areas to see what domains this builder covers.",
    subtitle: (buildCount, coveredCount) =>
      `${buildCount} ${buildCount === 1 ? "build" : "builds"} across ${coveredCount} focus areas`,
    insightEmpty: "No focus areas tagged yet. Builds will appear here once tagged.",
  },
};

export default function BuilderEcosystem({
  builder,
  slug,
  surface = "portfolio",
  onOpenProject,
  mode = "capability-markers",
}) {
  const modeMeta = MODE_META[mode] ?? MODE_META["capability-markers"];
  const builds = useMemo(() => getRadarProjects(builder).map(toBuild), [builder]);
  const [hoveredBuildId, setHoveredBuildId] = useState(null);
  const [hoveredAxis, setHoveredAxis] = useState(null);
  const [expandedBuildId, setExpandedBuildId] = useState(surface === "portfolio" ? builds[0]?.id ?? null : null);

  const highlightedBuilds = useMemo(() => {
    if (hoveredAxis) {
      return new Set(builds.filter((build) => build.capabilities.includes(hoveredAxis)).map((build) => build.id));
    }

    if (hoveredBuildId) {
      return new Set([hoveredBuildId]);
    }

    return expandedBuildId ? new Set([expandedBuildId]) : new Set();
  }, [builds, expandedBuildId, hoveredAxis, hoveredBuildId]);

  const highlightedAxes = useMemo(() => {
    if (hoveredBuildId) {
      return builds.find((build) => build.id === hoveredBuildId)?.capabilities ?? [];
    }

    if (hoveredAxis) {
      return [hoveredAxis];
    }

    return builds.find((build) => build.id === expandedBuildId)?.capabilities ?? [];
  }, [builds, expandedBuildId, hoveredAxis, hoveredBuildId]);

  const types = [...new Set(builds.map((build) => build.type))];
  const coveredAxes = [...new Set(builds.flatMap((build) => build.capabilities))];
  const topAxes = RADAR_AXES.map((axis) => ({
    ...axis,
    count: builds.filter((build) => build.capabilities.includes(axis.id)).length,
  }))
    .filter((axis) => axis.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);
  const uncoveredAxes = RADAR_AXES.filter((axis) => !coveredAxes.includes(axis.id));

  const focusMap = useMemo(() => getFocusAreaProjects(builder), [builder]);
  const focusAreaCount = Object.keys(focusMap).length;
  const focusProjectCount = new Set(Object.values(focusMap).flatMap((p) => p.map((x) => x.id))).size;

  if (mode === "what-it-does") {
    if (!focusProjectCount) {
      return (
        <div className={`ecosystem-card ecosystem-card-${surface}`}>
          <div className="ecosystem-empty">
            <div className="ecosystem-kicker">{modeMeta.kicker}</div>
            <h2>{modeMeta.emptyTitle}</h2>
            <p>{modeMeta.emptyCopy}</p>
          </div>
          <style jsx>{baseStyles}</style>
        </div>
      );
    }

    return (
      <div className={`ecosystem-shell ecosystem-shell-${surface}`}>
        <div className={`ecosystem-card ecosystem-card-${surface}`}>
          <div className="ecosystem-header">
            <div>
              <div className="ecosystem-kicker">{modeMeta.kicker}</div>
              <div className="ecosystem-title">{builder.displayName}'s Focus Areas</div>
              <div className="ecosystem-subtitle">{modeMeta.subtitle(focusProjectCount, focusAreaCount)}</div>
            </div>
          </div>

          <div style={{ padding: "16px 20px" }}>
            <FocusAreaGrid builder={builder} onOpenProject={onOpenProject} />
          </div>

          <div className="ecosystem-footer">
            <span>{surface === "chat" ? "Chuckie pulled up the focus area view." : "Builds are grouped by what they do."}</span>
          </div>
        </div>
        <style jsx>{baseStyles}</style>
        <style jsx global>{fontStyles}</style>
      </div>
    );
  }

  if (!builds.length) {
    return (
      <div className={`ecosystem-card ecosystem-card-${surface}`}>
        <div className="ecosystem-empty">
          <div className="ecosystem-kicker">{modeMeta.kicker}</div>
          <h2>{modeMeta.emptyTitle}</h2>
          <p>{modeMeta.emptyCopy}</p>
        </div>
        <style jsx>{baseStyles}</style>
      </div>
    );
  }

  return (
    <div className={`ecosystem-shell ecosystem-shell-${surface}`}>
      <div className={`ecosystem-card ecosystem-card-${surface}`}>
        <div className="ecosystem-header">
          <div>
            <div className="ecosystem-kicker">{modeMeta.kicker}</div>
            <div className="ecosystem-title">{builder.displayName}'s Portfolio Map</div>
            <div className="ecosystem-subtitle">{modeMeta.subtitle(builds.length, coveredAxes.length)}</div>
          </div>
          <div className="ecosystem-stat-row">
            {[
              { value: builds.length, label: "Builds" },
              { value: `${coveredAxes.length}/${RADAR_AXES.length}`, label: "Coverage" },
              { value: types.length, label: "Types" },
            ].map((stat) => (
              <div key={stat.label} className="ecosystem-stat">
                <div className="ecosystem-stat-value">{stat.value}</div>
                <div className="ecosystem-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ecosystem-body">
          <div className="ecosystem-radar-wrap">
            <Radar builds={builds} size={255} highlightedAxes={highlightedAxes} onHoverAxis={setHoveredAxis} />
            <div className="ecosystem-depth-legend">
              <span>1 build = light</span>
              <span>2 = medium</span>
              <span>3+ = deep</span>
            </div>
          </div>

          <div className="ecosystem-build-list">
            {builds.map((build) => (
              <div key={build.id} className="ecosystem-build-row">
                <BuildPill
                  build={build}
                  highlighted={highlightedBuilds.has(build.id)}
                  onHover={setHoveredBuildId}
                  onSelect={(buildId) => setExpandedBuildId((current) => (current === buildId ? null : buildId))}
                />
                {expandedBuildId === build.id ? (
                  <BuildDetail
                    build={build}
                    slug={slug}
                    surface={surface}
                    onClose={() => setExpandedBuildId(null)}
                    onOpenProject={onOpenProject}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="ecosystem-type-section">
          <div className="ecosystem-type-bar">
            {types.map((type) => {
              const count = builds.filter((build) => build.type === type).length;
              const typeStyle = RADAR_BUILD_TYPE_STYLES[type] ?? RADAR_BUILD_TYPE_STYLES.Agent;
              return (
                <div
                  key={type}
                  className="ecosystem-type-bar-segment"
                  style={{ flex: count, background: typeStyle.text }}
                />
              );
            })}
          </div>

          <div className="ecosystem-type-legend">
            {types.map((type) => {
              const count = builds.filter((build) => build.type === type).length;
              const typeStyle = RADAR_BUILD_TYPE_STYLES[type] ?? RADAR_BUILD_TYPE_STYLES.Agent;
              return (
                <div key={type} className="ecosystem-type-item">
                  <span className="ecosystem-type-dot" style={{ background: typeStyle.text }} />
                  <span className="ecosystem-type-name">{type}</span>
                  <span className="ecosystem-type-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ecosystem-insight">
          {topAxes.length ? (
            <div className="ecosystem-insight-copy">
              <strong>Goes deepest in </strong>
              {topAxes.map((axis, index) => (
                <span key={axis.id}>
                  <span className="ecosystem-axis-inline">
                    {axis.icon} {axis.short}
                  </span>
                  <span className="ecosystem-axis-inline-count"> ({axis.count})</span>
                  {index < topAxes.length - 1 ? (index === topAxes.length - 2 ? " and " : ", ") : ""}
                </span>
              ))}
            </div>
          ) : (
            <div className="ecosystem-insight-copy">
              <strong>{modeMeta.insightEmpty}</strong>
            </div>
          )}
          {uncoveredAxes.length ? (
            <div className="ecosystem-uncovered">
              Not yet covered: {uncoveredAxes.map((axis) => `${axis.icon} ${axis.short}`).join(", ")}
            </div>
          ) : null}
        </div>

        <div className="ecosystem-footer">
          <span>{surface === "chat" ? "Chuckie pulled up the full map." : "Ask Chuckie about any part of this map."}</span>
          {surface === "chat" ? (
            <Link href={getPortfolioPathForSlug(slug)} className="ecosystem-inline-link">
              See full portfolio page
            </Link>
          ) : (
            <span className="ecosystem-footer-meta">Tagged projects stay in sync with portfolio data.</span>
          )}
        </div>
      </div>

      <style jsx>{baseStyles}</style>
      <style jsx global>{fontStyles}</style>
    </div>
  );
}

const fontStyles = `
  @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap");
`;

const baseStyles = `
  .ecosystem-shell {
    width: 100%;
  }

  .ecosystem-card {
    background: #fff;
    border-radius: 6px;
    border: 1px solid #eeedf2;
    overflow: hidden;
    font-family: "IBM Plex Sans", "Avenir Next", sans-serif;
  }

  .ecosystem-card-portfolio {
    max-width: 960px;
    margin: 0 auto;
  }

  .ecosystem-header {
    padding: 14px 16px 10px;
    border-bottom: 1px solid #f2f0f5;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .ecosystem-kicker,
  .ecosystem-stat-label,
  .ecosystem-axis-label,
  .ecosystem-axis-count,
  .ecosystem-build-type,
  .ecosystem-type-name,
  .ecosystem-type-count,
  .ecosystem-footer,
  .ecosystem-inline-link,
  .ecosystem-uncovered,
  .ecosystem-depth-legend,
  .ecosystem-footer-meta {
    font-family: "IBM Plex Mono", monospace;
  }

  .ecosystem-kicker {
    font-size: 9px;
    font-weight: 600;
    color: #7c5cfc;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .ecosystem-title {
    font-size: 17px;
    font-weight: 700;
    color: #1a1a2e;
    line-height: 1.2;
  }

  .ecosystem-subtitle {
    font-size: 13px;
    color: #8a8698;
    margin-top: 3px;
    line-height: 1.4;
  }

  .ecosystem-stat-row {
    display: flex;
    gap: 14px;
  }

  .ecosystem-stat {
    text-align: center;
  }

  .ecosystem-stat-value {
    font-family: "IBM Plex Mono", monospace;
    font-size: 16px;
    font-weight: 700;
    color: #1a1a2e;
    line-height: 1;
  }

  .ecosystem-stat-label {
    font-size: 7px;
    color: #a09cac;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .ecosystem-body {
    display: flex;
    align-items: flex-start;
    padding: 10px 14px 12px;
    gap: 6px;
  }

  .ecosystem-radar-wrap {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .ecosystem-radar {
    overflow: visible;
  }

  .ecosystem-axis-group {
    cursor: pointer;
  }

  .ecosystem-axis-icon {
    font-size: 14px;
  }

  .ecosystem-axis-label {
    font-size: 8.5px;
    font-weight: 400;
    fill: #555;
    letter-spacing: 0.03em;
    transition: all 0.2s ease;
  }

  .ecosystem-axis-label-active {
    fill: #7c5cfc;
    font-weight: 600;
  }

  .ecosystem-axis-label-empty {
    fill: #c8c4d0;
  }

  .ecosystem-axis-count {
    font-size: 9px;
    font-weight: 700;
    fill: #7c5cfc;
  }

  .ecosystem-depth-legend {
    display: flex;
    gap: 10px;
    margin-top: 2px;
    font-size: 8px;
    color: #b0abba;
  }

  .ecosystem-build-list {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-left: 8px;
  }

  .ecosystem-build-pill {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 4px;
    background: var(--ecosystem-pill-bg);
    border: 1px solid var(--ecosystem-pill-border);
    cursor: pointer;
    transition: border-color 0.15s ease;
    text-align: left;
  }

  .ecosystem-build-pill-active {
    transform: translateX(3px);
  }

  .ecosystem-build-mini {
    font-size: 15px;
    flex-shrink: 0;
  }

  .ecosystem-build-copy {
    flex: 1;
    min-width: 0;
  }

  .ecosystem-build-name {
    font-size: 13px;
    font-weight: 600;
    color: #1a1a2e;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ecosystem-build-desc {
    font-size: 11px;
    color: #8a8698;
    line-height: 1.3;
    margin-top: 1px;
  }

  .ecosystem-build-type {
    font-size: 8px;
    font-weight: 600;
    color: var(--ecosystem-pill-type-text);
    background: var(--ecosystem-pill-type-bg);
    border: 1px solid var(--ecosystem-pill-type-border);
    padding: 2px 7px;
    border-radius: 4px;
    flex-shrink: 0;
    letter-spacing: 0.04em;
    line-height: 1.25;
    text-align: center;
  }

  .ecosystem-build-detail {
    background: #fff;
    border-radius: 4px;
    border: 1px solid var(--ecosystem-detail-border);
    padding: 12px 14px;
    margin-top: 4px;
    animation: ecosystemSlideDown 0.15s ease both;
  }

  .ecosystem-build-detail-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 10px;
  }

  .ecosystem-build-detail-identity {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ecosystem-build-detail-mini {
    font-size: 22px;
  }

  .ecosystem-build-detail-name {
    font-size: 15px;
    font-weight: 700;
    color: #1a1a2e;
  }

  .ecosystem-build-detail-desc {
    font-size: 11px;
    color: #8a8698;
  }

  .ecosystem-build-detail-close {
    background: #f5f3f8;
    border: none;
    border-radius: 3px;
    width: 20px;
    height: 20px;
    cursor: pointer;
    color: #8a8698;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .ecosystem-build-detail-copy {
    font-size: 13px;
    color: #555;
    line-height: 1.6;
    margin-bottom: 12px;
  }

  .ecosystem-capability-row {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  }

  .ecosystem-capability-empty {
    font-size: 11px;
    color: #8a8698;
    line-height: 1.5;
  }

  .ecosystem-capability-tag {
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
    background: #f5f3fa;
    color: #7c5cfc;
    border: 1px solid #e0dbf0;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 500;
  }

  .ecosystem-build-detail-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .ecosystem-inline-link {
    font-size: 10px;
    color: #7c5cfc;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-decoration: none;
  }

  .ecosystem-inline-button {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .ecosystem-type-section {
    padding: 0 16px 10px;
  }

  .ecosystem-type-bar {
    display: flex;
    height: 4px;
    border-radius: 2px;
    overflow: hidden;
    gap: 2px;
  }

  .ecosystem-type-bar-segment {
    border-radius: 2px;
    opacity: 0.55;
    transition: flex 0.3s ease;
  }

  .ecosystem-type-legend {
    display: flex;
    gap: 12px;
    margin-top: 6px;
    flex-wrap: wrap;
  }

  .ecosystem-type-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .ecosystem-type-dot {
    width: 6px;
    height: 6px;
    border-radius: 2px;
    opacity: 0.55;
  }

  .ecosystem-type-name,
  .ecosystem-type-count {
    font-size: 9px;
    color: #8a8698;
  }

  .ecosystem-type-count {
    color: #b8b4c2;
  }

  .ecosystem-insight {
    padding: 8px 16px;
    border-top: 1px solid #f2f0f5;
    background: #fcfbfe;
  }

  .ecosystem-insight-copy {
    font-size: 12px;
    color: #555;
    line-height: 1.6;
  }

  .ecosystem-axis-inline {
    color: #7c5cfc;
    font-weight: 600;
  }

  .ecosystem-axis-inline-count {
    color: #8a8698;
  }

  .ecosystem-uncovered {
    font-size: 11px;
    color: #b8b4c2;
    margin-top: 3px;
  }

  .ecosystem-footer {
    padding: 8px 16px;
    border-top: 1px solid #f2f0f5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    font-size: 9px;
    color: #b8b4c2;
    letter-spacing: 0.04em;
  }

  .ecosystem-empty {
    padding: 16px;
  }

  .ecosystem-empty h2 {
    margin: 6px 0 4px;
    font-size: 20px;
    letter-spacing: -0.03em;
    color: #1a1a2e;
  }

  .ecosystem-empty p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #6d6980;
  }

  .ecosystem-focus-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }

  .ecosystem-focus-card {
    border: 1px solid #EEEDF2;
    border-radius: 4px;
    padding: 10px;
    background: #FCFBFE;
  }

  .ecosystem-focus-card-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }

  .ecosystem-focus-icon {
    font-size: 16px;
  }

  .ecosystem-focus-label {
    font-size: 13px;
    font-weight: 600;
    color: #1a1a2e;
  }

  .ecosystem-focus-count {
    font-family: "IBM Plex Mono", monospace;
    font-size: 11px;
    color: #7c5cfc;
    background: #f5f3fa;
    border-radius: 4px;
    padding: 1px 6px;
    margin-left: auto;
  }

  .ecosystem-focus-projects {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ecosystem-focus-project {
    width: 100%;
    text-align: left;
    padding: 6px 8px;
    border-radius: 3px;
    border: 1px solid #EEEDF2;
    background: #fff;
    cursor: pointer;
    transition: border-color 0.2s ease;
  }

  .ecosystem-focus-project:hover {
    border-color: #DDD6FE;
  }

  .ecosystem-focus-project strong {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #1a1a2e;
    line-height: 1.3;
  }

  .ecosystem-focus-project span {
    display: block;
    font-size: 11px;
    color: #8a8698;
    line-height: 1.3;
    margin-top: 2px;
  }

  @keyframes ecosystemSlideDown {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 760px) {
    .ecosystem-header,
    .ecosystem-body,
    .ecosystem-footer {
      flex-direction: column;
      align-items: stretch;
    }

    .ecosystem-stat-row {
      justify-content: flex-start;
    }

    .ecosystem-build-list {
      padding-left: 0;
    }

    .ecosystem-footer {
      gap: 6px;
    }

    .ecosystem-build-pill {
      align-items: flex-start;
    }

    .ecosystem-build-name {
      white-space: normal;
    }

    .ecosystem-depth-legend {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
`;
