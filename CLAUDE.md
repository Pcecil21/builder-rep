# CLAUDE.md — Builder Rep / Chuckie

This file defines what the product is, how it should behave, and what the rules are. It is the durable reference for every coding session. For current project state, open issues, and what to work on next, see `HANDOFF.md`.

## What This Product Is

Builder Rep is a platform where AI builders create a public-facing agent representative called Chuckie. Named after Good Will Hunting's best friend who interviews on his behalf, Chuckie is an agent-as-portfolio. Instead of sending someone a PDF or a link, you send them your agent, which can speak to everything you've built.

Chuckie is the atomic unit of a larger AIDB product stack:

- **Free Education** — self-directed training modules on AI building
- **Paid Certification ($20/month)** — perpetual-currency credential with monthly build requirements verified through Chuckie
- **Talent Marketplace** — certified builders opt in to make their Chuckie searchable; employer-side agents match against the database
- **Enterprise Bundle** — Superintelligent packages the full stack for enterprise buyers

Chuckie serves as the builder's identity layer across every context: the portfolio that employers interact with, the verification mechanism for certification, and the artifact that makes a certified builder tangibly different from an uncertified one.

## Product Surfaces

### Private Studio (`/studio`)

Where builders create and manage their Chuckie. Three tabs:

- **Chat** — the primary intake flow. Chuckie interviews the builder conversationally.
- **What Chuckie Knows** — read-only recap of what Chuckie has learned, plus structured context (tool stack, GitHub). Not a form.
- **Studio** — structured project editor for adding and managing builds. Form-based, not conversational.

### Public Rep (`/rep/[slug]`)

The public-facing Chuckie page. Visitors can chat with Chuckie about the builder and browse their work. Server-rendered from published builder data.

### Portfolio Map (`/rep/[slug]/portfolio`)

Visual display of the builder's work. Capability-marker radar for agent builds plus a project library.

## Core Design Principles

These override all implementation decisions.

### 1. Chuckie always wants to know more

Chuckie is not a passive form waiting for input. It is an agent that actively identifies gaps in its knowledge and asks the builder to fill them. It should always have another good question to ask. The profile is never "complete." Chuckie's curiosity is what makes it feel alive.

### 2. The profile is a living document

There is no "reveal" moment. No summary for approval. The profile updates in real time as the builder talks to Chuckie, adds builds, or provides context. The builder can glance at it anytime. If it looks thin, the natural response is to talk to Chuckie more.

### 3. Conversational for storytelling, forms for data entry

Use conversation when pulling out who someone is — their background, philosophy, story. Use forms when someone already knows what they want to input — build name, description, tags, links. Never make conversation do a form's job (slow) or forms do a conversation's job (shallow).

### 4. The internal checklist is invisible

Chuckie's interview engine works from a set of topics: background, relationship to AI, current focus, most interesting build, ideal work, builder philosophy, origin story. The builder must never see this list as fields, steps, coverage trackers, progress bars, or pill-shaped tags. The checklist drives backend behavior. It is never exposed in the UI.

### 5. No product requirements in the interface

Do not paste internal intent, implementation notes, or team commentary into UI copy. "It should ask the next best question" is a product requirement, not something the builder should read. Just make the behavior correct.

### 6. Blank scaffolding is not knowledge

Placeholder data, empty defaults, and synthetic state must never trigger "returning builder" behavior or imply Chuckie knows something it doesn't. If Chuckie knows nothing, it should say so clearly and start learning.

## Onboarding Flow

The onboarding alternates between structured and conversational. Each step makes the next one smarter.

### Step 1: Structured Basics

Not conversational. Collects foundational context before Chuckie speaks.

- **Tool stack** — selectable grid with two tiers: "use regularly" and "familiar with"
- **GitHub profile** — URL or connection for repo scanning

### Step 2: Adaptive Conversational Interview

A real chat UI. Threaded messages. Scrolling conversation. Chuckie asks, builder responds.

- Internal checklist drives question selection but is never visible
- Depth over breadth — follow interesting threads as deep as the builder wants
- Adaptive to Step 1 context — don't re-ask what's already known
- No fixed length — works for 5 minutes or an hour
- Chuckie reflects back what it hears between questions
- Profile updates in real time as conversation progresses

### Step 3: Build Entry

Primarily a form. The builder knows what they built.

- GitHub repo connection at top → Chuckie pre-populates what it can
- Standard form fields for metadata and tagging
- Optional "tell Chuckie more" at bottom for unstructured context

### Step 4: Ongoing Enrichment

Persistent. Always available. The builder can talk to Chuckie about background or any specific project at any time. Chuckie proactively surfaces what it doesn't know.

## Build Taxonomy

Every build is tagged across three independent dimensions.

### Build Type (single-select)

"What is this thing?"

| Type | Description | Triggers Capability Markers |
|---|---|---|
| Agent | Autonomous agent or agent system | Yes |
| AI Product/App | Website, tool, dashboard, app built with AI | No |
| Workflow / Automation | Process, pipeline, automation | No |
| Creative | Art, music, video, expressive output | No |

### What It Does (multi-select, up to 3)

"What domain does it serve?"

Research · Data Analysis · Writing · Content Creation · Coding/Dev · Design · Automation · Strategy · Search/Retrieval · Comms/Chat · Planning · Sales/Marketing · Operations · Education · Audio/Voice · Video/Media · Productivity · Enterprise Tool · Consumer App · Other

### Capability Markers (multi-select, Agent builds only)

"What builder skills does this agent build demonstrate?"

| Marker | What it proves |
|---|---|
| Individual Agents | Built a standalone autonomous agent |
| Multi-Agent Systems | Built agents that hand off to each other with real flow |
| Orchestration Systems | Built the routing/control plane that manages agents |
| External Data Connections | Agent connects to MCP, APIs, live external sources |
| Internal Tool Connections | Agent connects to CRM, Slack, email, databases, internal systems |
| Knowledge Bases | Agent grounded in real knowledge via RAG, document ingestion, etc. |
| Skills / Tool Use | Agent takes actions: search, file generation, code execution, etc. |

Capability Markers are the foundation for:
- The lattice/radar visualization on the public profile
- Certification requirement mapping
- Talent marketplace search and matching

## Chuckie's Personality

Chuckie represents the builder to the world. Its personality should reflect:

- **Genuinely curious** — always wants to learn more about the builder
- **Substantive** — can speak in depth about the builder's work, not just surface descriptions
- **Warm but professional** — approachable without being sycophantic
- **Honest about its limits** — if it doesn't know something, it says so and asks

In the studio (private), Chuckie is an interviewer pulling signal out of the builder.
In the public rep, Chuckie is a representative speaking on the builder's behalf.

These are different modes with different system prompts, but the underlying personality is consistent.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Frontend:** React, JSX components
- **Styling:** CSS (in `src/styles.css`)
- **Persistence:** File-based (local dev) or Postgres (deployed), controlled by `lib/server/store.js`
- **File uploads:** Supabase Storage
- **AI:** Currently OpenAI API (migration to Anthropic API under consideration)
- **Deployment:** Vercel

## Key Architectural Patterns

- **Draft/Publish model** — builders work on a draft in the studio, then publish to make it public
- **Dual chat contexts** — studio chat (private, interview mode) and public chat (viewer-facing, representative mode) share some infrastructure but have different system prompts and behavior
- **Store abstraction** — `lib/server/store.js` switches between file store and Postgres based on environment
- **Autosave** — studio changes save automatically

## File Structure Orientation

Frontend:
- `app/studio/page.js` — studio entry point
- `components/StudioShell.jsx` — studio shell/layout
- `src/components/BuilderStudio.jsx` — main chat-first builder experience
- `src/components/BuilderSetup.jsx` — legacy structured editor (secondary)
- `components/PublicRepClient.jsx` — public rep page
- `components/PortfolioPageClient.jsx` — portfolio map
- `components/BuilderEcosystem.jsx` — ecosystem view

Backend:
- `app/api/studio/chat/route.js` — studio chat API
- `app/api/public/chat/route.js` — public chat API
- `lib/server/chat.js` — shared chat logic (overloaded, needs splitting)
- `lib/server/store.js` — persistence layer
- `lib/builder-profile.js` — builder data utilities

## Environment Variables

- `APP_URL` — application URL
- `DATABASE_URL` — Postgres connection (if absent, file store is used)
- `REQUIRE_DATABASE` — enforce DB in production
- `OPENAI_API_KEY` — required for studio interview to function
- `SUPABASE_URL` — for screenshot uploads
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase auth
- `SUPABASE_STORAGE_BUCKET` — upload bucket name

## Anti-Patterns to Avoid

These are mistakes that have been made before. Do not repeat them.

1. **Visible interview steps or progress trackers.** No wizard steps, no coverage pills, no "0/7 areas captured" indicators. The builder should never see the interview checklist.

2. **Form fields for interview topics.** Background, Relationship to AI, etc. are not form fields. They are categories the interview engine uses internally. If they appear in the UI, they should be read-only recaps of what Chuckie has learned, never empty text areas.

3. **Chat that looks like a form.** The interview must be a real chat interface — threaded messages, scrolling, message composer at bottom. Not a text area inside a card with a send button.

4. **Product requirements as UI copy.** Internal intent should never be visible to the builder. No copy like "Chuckie is pulling signal from your story" or "the interview engine will adapt." Just make it work.

5. **Placeholder data treated as real.** Empty or default state must never imply Chuckie already knows something. If the profile is blank, Chuckie should say it's blank and start asking questions.

6. **Conversation where forms belong.** Adding a build is a data entry task. Don't make people describe their build through three rounds of back-and-forth when they could fill in fields in 30 seconds. Conversational assist is for enrichment after the basics are captured.

## Build and Dev Commands

- `npm run dev` — start development server
- `npm run build` — production build (currently the primary verification method)
