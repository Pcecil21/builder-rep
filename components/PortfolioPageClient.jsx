"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BuilderEcosystem from "@/components/BuilderEcosystem";
import { getRadarProjects } from "@/lib/radar";
import { BrowseProjectRow, ProjectDetailObject } from "@/src/components/RichObjects";

function getProject(builder, projectId) {
  return builder.projects.find((project) => project.id === projectId) ?? null;
}

export default function PortfolioPageClient({ builder, slug }) {
  const [selectedProjectId, setSelectedProjectId] = useState(builder.projects[0]?.id ?? null);
  const mappedProjects = useMemo(() => getRadarProjects(builder), [builder]);
  const selectedProject = getProject(builder, selectedProjectId) ?? builder.projects[0] ?? null;

  const openProjectDetails = (projectId) => {
    setSelectedProjectId(projectId);
    document.getElementById("portfolio-project-details")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const linkOut = (projectId) => {
    const project = getProject(builder, projectId);
    if (!project?.primaryLink?.url) {
      return;
    }

    window.open(project.primaryLink.url, "_blank", "noopener,noreferrer");
  };

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
          <Link href={`/rep/${slug}`} className="ghost-button">
            Back to Chat
          </Link>
        </div>
      </header>

      <main className="portfolio-main">
        <section className="portfolio-hero">
          <div className="portfolio-hero-copy">
            <div className="landing-eyebrow">Portfolio View</div>
            <h1>{builder.displayName}'s built ecosystem</h1>
            <p>{builder.shortBio}</p>
            <div className="portfolio-meta-row">
              <span>{builder.projects.length} public projects</span>
              <span>{mappedProjects.length} mapped into the ecosystem radar</span>
              <Link href={`/rep/${slug}`} className="portfolio-inline-link">
                Open Chuckie chat
              </Link>
            </div>
          </div>

          <BuilderEcosystem builder={builder} slug={slug} onOpenProject={openProjectDetails} />
        </section>

        <section className="portfolio-projects">
          <div className="portfolio-section-head">
            <div>
              <div className="review-section-label">Project Library</div>
              <h2>Browse the full body of work</h2>
              <p>
                The radar gives the shape. The project library below gives the full case-file treatment for each build.
              </p>
            </div>
          </div>

          <div className="portfolio-browse-grid">
            <div className="portfolio-stack">
              {builder.projects.map((project) => (
                <BrowseProjectRow key={project.id} project={project} onOpen={setSelectedProjectId} />
              ))}
            </div>

            <div id="portfolio-project-details">
              {selectedProject ? <ProjectDetailObject project={selectedProject} onLinkOut={linkOut} /> : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
