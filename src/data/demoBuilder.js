export const demoBuilder = {
  id: "nlw-demo",
  name: "NLW",
  displayName: "NLW",
  slug: "nlw",
  shortBio: "Agent systems, orchestration architectures, and AI-native products.",
  longerIntro:
    "NLW builds agent systems that make real work legible through products, workflows, and orchestration. Chuckie is the conversational representative for that body of work.",
  featuredIntroLine:
    "I'm Chuckie. NLW can't be everywhere, so he built me. I know what he's built, how he thinks, and I can show you any of it. What are you curious about?",
  themes: [
    "Agent orchestration",
    "AI-native product design",
    "Systems thinking",
    "Fast iteration",
  ],
  highlightedThemes: [
    "Projects are the main proof",
    "Real artifacts beat descriptions",
    "The why matters as much as the what",
  ],
  preferredOpeningProjects: ["camp-claw", "holmes", "mission-control"],
  voiceNotes: [
    "Direct and editorial without sounding like a recruiter",
    "Connect broad ideas back to real work",
    "Prefer showing projects and artifacts over generic summaries",
  ],
  promptStarts: [
    "Show me what NLW has built",
    "How does NLW think about agents?",
    "What is NLW's best orchestration work?",
    "Show me the full ecosystem",
    "Show me strategy-related projects",
    "Let me interact with something NLW built",
  ],
  projects: [
    {
      id: "camp-claw",
      title: "Camp Claw",
      category: "public app",
      shortDescription: "A builder onramp structured around shipping real agent artifacts.",
      longDescription:
        "Camp Claw is a build-sequence product that turns learning into shipped work. The emphasis is on completing artifacts, not consuming content.",
      problem:
        "Most AI learning experiences are content-heavy and work-light, which makes it hard to understand what someone can actually build.",
      whatItIs:
        "A public build program and productized sequence for agent builders.",
      whyItMatters:
        "It demonstrates an ability to design systems that create momentum, visible outputs, and community proof.",
      whatItDemonstrates:
        "Product framing, educational systems design, and builder-centric orchestration.",
      whyBuiltThisWay:
        "The structure centers on artifact production because proof compounds faster than explanation.",
      designNotes: [
        "Sequence built around progressive confidence and visible outputs",
        "Prompts and checkpoints designed to reduce passive consumption",
      ],
      status: "live",
      featured: true,
      buildType: "Public App",
      capabilities: ["community", "content"],
      tags: ["education", "community", "agents"],
      tools: ["OpenClaw", "Claude Code", "Codex"],
      systems: ["Community loop", "Build sequence"],
      primaryLink: {
        type: "website",
        title: "Visit Camp Claw",
        url: "https://campclaw.ai",
        description: "Public entry point for the program and build sequence.",
      },
      supportingLinks: [
        {
          type: "artifact",
          title: "Build Sequence",
          url: "https://campclaw.ai",
          description: "Walk through the artifact-driven sequence.",
        },
      ],
      visuals: [
        {
          title: "Build sequence",
          description: "The structured progression from setup to working agents.",
        },
        {
          title: "Community gallery",
          description: "A proof layer showing what participants actually shipped.",
        },
      ],
      artifacts: ["Program structure", "Shipped builder outputs"],
    },
    {
      id: "aidb-new-year",
      title: "AIDB New Year",
      category: "experiment",
      shortDescription: "A fast, AI-native interactive experience built and shipped on a compressed timeline.",
      longDescription:
        "AIDB New Year is a compact interactive project that shows how quickly a concept can move from idea to public experience in an AI-native workflow.",
      problem:
        "Seasonal and editorial moments often move too fast for conventional product cycles.",
      whatItIs:
        "An interactive public-facing experiment tied to AI Daily Brief.",
      whyItMatters:
        "It shows taste, speed, and the ability to ship something polished under time pressure.",
      whatItDemonstrates:
        "Rapid prototyping, editorial product sense, and AI-assisted execution.",
      whyBuiltThisWay:
        "The project intentionally optimized for speed-to-experience over depth of feature set.",
      designNotes: [
        "Compressed scope to preserve polish",
        "Used AI-native tooling to reduce cycle time",
      ],
      status: "live",
      featured: false,
      buildType: "Public App",
      capabilities: ["community"],
      tags: ["interactive", "editorial", "rapid-build"],
      tools: ["Lovable", "Claude", "AI video tooling"],
      systems: ["Public launch workflow"],
      primaryLink: {
        type: "website",
        title: "Open AIDB New Year",
        url: "https://aidailybrief.com",
        description: "Representative external destination for the project context.",
      },
      supportingLinks: [],
      visuals: [
        {
          title: "Interactive landing experience",
          description: "A compact, polished surface designed for a timely release.",
        },
      ],
      artifacts: ["Interactive prototype"],
    },
    {
      id: "sponsor-dashboard",
      title: "Sponsor Dashboard",
      category: "dashboard",
      shortDescription: "A sponsor-facing reporting surface that removes manual campaign updates.",
      longDescription:
        "The Sponsor Dashboard turns campaign reporting into a self-serve product. Instead of producing updates by hand, sponsors can inspect relevant metrics directly.",
      problem:
        "Manual sponsor reporting creates recurring operational overhead and delays access to useful data.",
      whatItIs:
        "A reporting dashboard with sponsor-specific views and ongoing data refresh.",
      whyItMatters:
        "It shows the ability to productize an internal pain point into a durable operational tool.",
      whatItDemonstrates:
        "Automation design, information architecture, and business-facing product judgment.",
      whyBuiltThisWay:
        "The system favors direct sponsor access because self-service scales better than recurring manual reporting.",
      designNotes: [
        "Views are scoped around stakeholder questions, not raw data exhaust",
        "The product removes repetitive manual operational work",
      ],
      status: "internal",
      featured: true,
      buildType: "Automation",
      capabilities: ["automation", "data"],
      tags: ["automation", "reporting", "business-tool"],
      tools: ["Dashboard stack", "Data integrations"],
      systems: ["Metrics ingestion", "Sponsor reporting workflow"],
      primaryLink: {
        type: "website",
        title: "View Sponsor Context",
        url: "https://aidailybrief.com",
        description: "Public context for the business and reporting environment.",
      },
      supportingLinks: [],
      visuals: [
        {
          title: "Sponsor metrics view",
          description: "An interface focused on the metrics a sponsor actually needs.",
        },
      ],
      artifacts: ["Dashboard", "Reporting workflow"],
    },
    {
      id: "holmes",
      title: "Holmes",
      category: "agent",
      shortDescription: "An AI opportunity partner that runs structured discovery conversations.",
      longDescription:
        "Holmes translates expert discovery work into an always-on conversational system that surfaces where AI can create leverage in someone's work.",
      problem:
        "The initial phase of AI consulting is expensive, repetitive, and difficult to scale well.",
      whatItIs:
        "A conversational agent deployed across web and Slack for structured opportunity discovery.",
      whyItMatters:
        "It turns a consultative workflow into a productized system that can operate continuously.",
      whatItDemonstrates:
        "Expert reasoning capture, multi-surface deployment, and conversational product design.",
      whyBuiltThisWay:
        "The system is built to encode discovery frameworks into a repeatable agent experience rather than simply augmenting a consultant.",
      designNotes: [
        "Same core logic deployed across more than one user surface",
        "Discovery flow optimized for structured reasoning, not open-ended chat alone",
      ],
      status: "demo",
      featured: true,
      buildType: "Agent",
      capabilities: ["research", "data"],
      tags: ["agent", "discovery", "web", "slack"],
      tools: ["Claude", "Slack", "Web app stack"],
      systems: ["Opportunity mapping", "Conversation state"],
      primaryLink: {
        type: "demo",
        title: "See Holmes",
        url: "https://example.com/holmes-demo",
        description: "Representative demo link placeholder for the seeded prototype.",
      },
      supportingLinks: [
        {
          type: "artifact",
          title: "Opportunity Map Output",
          url: "https://example.com/holmes-output",
          description: "Example of the kind of output Holmes produces.",
        },
      ],
      visuals: [
        {
          title: "Discovery session",
          description: "Holmes guiding a structured conversation about workflows and opportunities.",
        },
        {
          title: "Opportunity map",
          description: "A synthesis artifact showing the highest-leverage AI opportunities.",
        },
      ],
      artifacts: ["Opportunity maps", "Discovery framework"],
    },
    {
      id: "mycroft",
      title: "Mycroft",
      category: "strategy tool",
      shortDescription: "A conversational strategy builder for organization-level AI planning.",
      longDescription:
        "Mycroft extends the discovery pattern into enterprise strategy work, creating multi-session output around roadmaps, tradeoffs, and implementation direction.",
      problem:
        "Organizations need AI strategy that reflects their actual context, not generic advisory language.",
      whatItIs:
        "A conversational system for building organization-wide AI strategy across multiple sessions.",
      whyItMatters:
        "It demonstrates how a system can synthesize repeated discovery into a broader strategic layer.",
      whatItDemonstrates:
        "Strategic reasoning, memory across sessions, and productized advisory workflows.",
      whyBuiltThisWay:
        "The design prioritizes continuity because strategy work gets better as the system accumulates context over time.",
      designNotes: [
        "Multi-session persistence is core to the product value",
        "Outputs emphasize prioritized decisions, not just transcripts",
      ],
      status: "prototype",
      featured: true,
      buildType: "Agent",
      capabilities: ["strategy", "research"],
      tags: ["strategy", "enterprise", "agent"],
      tools: ["Claude", "Slack", "Web app stack"],
      systems: ["Strategic synthesis", "Persistent state"],
      primaryLink: {
        type: "demo",
        title: "Explore Mycroft",
        url: "https://example.com/mycroft-demo",
        description: "Representative demo link placeholder for the seeded prototype.",
      },
      supportingLinks: [],
      visuals: [
        {
          title: "Strategy session",
          description: "A multi-session conversation shaping organization-level AI plans.",
        },
      ],
      artifacts: ["Roadmaps", "Strategy output"],
    },
    {
      id: "openclaw-team",
      title: "10-Agent OpenClaw Team",
      category: "multi-agent system",
      shortDescription: "A coordinated agent organization with specialized roles and oversight.",
      longDescription:
        "This project treats orchestration as an organizational design problem rather than a prompt-chaining problem. Multiple agents, roles, and oversight mechanisms work together as a system.",
      problem:
        "Single agents hit functional ceilings when tasks require specialization, routing, and ongoing coordination.",
      whatItIs:
        "A multi-agent team with researchers, managers, specialists, and a coordinating control layer.",
      whyItMatters:
        "It is one of the clearest expressions of the builder's orchestration thinking.",
      whatItDemonstrates:
        "System design, role decomposition, and the ability to structure coordination across agents.",
      whyBuiltThisWay:
        "The system is organized like a team because complex work benefits from explicit responsibilities, routing, and intervention points.",
      designNotes: [
        "Role clarity matters more than agent count",
        "Oversight is designed as part of the system, not a bolt-on",
      ],
      status: "prototype",
      featured: true,
      buildType: "Multi-Agent",
      capabilities: ["orchestration", "automation", "research", "content"],
      tags: ["multi-agent", "orchestration", "operations"],
      tools: ["OpenClaw", "Claude", "Telegram"],
      systems: ["Mission control", "Heartbeat research", "Task routing"],
      primaryLink: {
        type: "demo",
        title: "View Team Overview",
        url: "https://example.com/openclaw-team",
        description: "Representative system link placeholder for the seeded prototype.",
      },
      supportingLinks: [
        {
          type: "artifact",
          title: "Mission Control",
          url: "https://example.com/mission-control",
          description: "The management interface for the multi-agent system.",
        },
      ],
      visuals: [
        {
          title: "Agent map",
          description: "Specialized roles and the routing relationships between them.",
        },
        {
          title: "Mission control view",
          description: "A control layer for system visibility and intervention.",
        },
      ],
      artifacts: ["Team architecture", "Routing model"],
    },
    {
      id: "mission-control",
      title: "Mission Control",
      category: "internal tool",
      shortDescription: "An oversight and management interface for the agent team.",
      longDescription:
        "Mission Control is the operating surface that makes a multi-agent system understandable and steerable. It provides visibility into health, routing, and intervention.",
      problem:
        "Orchestrated systems become hard to trust and manage without a clear operational interface.",
      whatItIs:
        "A control-layer product for monitoring and steering a coordinated agent system.",
      whyItMatters:
        "It reveals that orchestration requires management UX, not only model behavior.",
      whatItDemonstrates:
        "Operational thinking, systems visibility, and interface design for AI workflows.",
      whyBuiltThisWay:
        "A management layer was necessary because multi-agent complexity creates blind spots unless the operator can see and intervene.",
      designNotes: [
        "Health and routing visibility come before aesthetic complexity",
        "Intervention points are treated as product features",
      ],
      status: "prototype",
      featured: false,
      buildType: "Automation",
      capabilities: ["orchestration", "data"],
      tags: ["orchestration", "control-layer", "operations"],
      tools: ["Dashboard stack", "Agent runtime"],
      systems: ["System monitoring", "Task visibility"],
      primaryLink: {
        type: "demo",
        title: "Open Mission Control",
        url: "https://example.com/mission-control",
        description: "Representative control surface placeholder for the seeded prototype.",
      },
      supportingLinks: [],
      visuals: [
        {
          title: "Health dashboard",
          description: "A system view for agent status, blockers, and routing.",
        },
      ],
      artifacts: ["Operations dashboard"],
    },
  ],
};
