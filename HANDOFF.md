# Builder Rep Handoff

Last updated: 2026-03-19

## Executive Summary

Builder Rep is a Next.js app for creating a public-facing "agent representative" for AI builders. The core product concept is that Chuckie interviews the builder, learns their work and judgment, and then represents them publicly through:

- a public rep/chat page
- a public portfolio map
- a private studio for building and publishing the profile

## Core Product Principles

These principles override all implementation decisions.

1. **Chuckie should always want to know more.** The profile is never "complete."
2. **The profile is a living document, not a deliverable.** No "reveal" moment. Updates in real time.
3. **Conversational for storytelling, forms for data entry.**
4. **The internal checklist is invisible.** Never exposed in the UI.
5. **Do not paste product requirements into the interface.**
6. **Blank scaffolding is not knowledge.**

For full product vision and design principles, see `CLAUDE.md`.

## What Has Changed (2026-03-19 Full Sweep)

### Tests Added

- **vitest** installed as dev dependency with `npm run test` script
- 87 unit tests across 8 test files covering:
  - `builder-profile.js` — normalization, interview signal, recap, question generation
  - `builder.js` — builder normalization, default builder creation, chat history
  - `build-taxonomy.js` / `radar.js` — build types, capabilities, focus areas, kind normalization
  - `studio-chat.js` — fallback studio responses for all stages
  - `viewer-chat.js` — fallback viewer responses
  - `interview-engine.js` — topic coverage, question selection, profile extraction, transitions
  - `focus-area-projects.js` — focus area grouping helper

### "What Chuckie Knows" Tab Fixed

- Removed the 7 interview topic textareas (`PROFILE_FIELD_ORDER.map(...)`) that exposed the internal checklist as form fields
- Removed the `updateProfileField` helper and unused `PROFILE_FIELD_LABELS` / `PROFILE_FIELD_ORDER` imports from BuilderStudio
- The tab now shows only: RecapCard (read-only recap), tool stack pickers, and GitHub context inputs
- Copy updated to reflect that structured context is limited to tools and GitHub

### Backend Refactored

**`lib/server/chat.js` split into focused modules:**

- `lib/server/openai-client.js` — `callOpenAI()`, `parseOutputText()`, model constants
- `lib/server/studio-chat.js` — `handleStudio()`, `buildStudioInstructions()`, `fallbackStudio()`, all studio schemas
- `lib/server/viewer-chat.js` — `handleViewer()`, `buildViewerInstructions()`, `fallbackViewer()`
- `lib/server/chat.js` — thin router exporting `handleChatPayload()` that delegates to the handler modules

API route files unchanged — they still import from `lib/server/chat.js`.

**API contract refactored:**

Old contract sent `stage` and `focusField` from the frontend. New contract:
```
context: "profile" | "build"   // what the builder is talking about
projectId: string              // which build (if context=build)
```

The backend infers `stage` and `focusField` from `context`, `projectId`, and conversation history. The frontend no longer needs to know about interview internals.

Files changed: `app/api/studio/chat/route.js`, `src/lib/api.js`, `src/components/BuilderStudio.jsx`, `lib/server/studio-chat.js`.

### Hidden Interview Engine Built

New module `lib/server/interview-engine.js` provides:

- `assessTopicCoverage(builder, history)` — returns topic -> { covered, depth, stale } map
- `selectNextTopic(coverage, history, builder)` — planner that decides to deepen, move on, revisit stale, or transition to builds
- `generateQuestion(topic, depth, builder, history)` — question bank with primary, follow-up, and contextual variants adapted to tool stack and GitHub
- `extractProfileUpdates(topic, userText, builder)` — parses response into field updates (appends/enriches at depth > 0)
- `shouldTransitionToBuilds(coverage, builder)` — natural build-discovery trigger
- `buildEngineContext(builder, history)` — convenience function returning full engine state

The engine is integrated into `studio-chat.js` — it computes suggested topic, question, and depth, which are injected into the LLM system prompt. The LLM handles natural language generation; the engine handles topic planning.

### Chat UI Polished

- **Auto-scroll** — `useRef` + `useEffect` in `ChatThread` scrolls to newest message
- **Typing indicator** — animated dots replacing static "Thinking..." text
- **Chuckie message bubbles** — subtle background with `border-radius: 18px 18px 18px 4px`
- **Tighter message spacing** — `.builder-conversation` gap reduced from 28px to 16px
- **Enter-to-send** — Enter sends, Shift+Enter for newline
- **Auto-resize textarea** — `useEffect` adjusting height based on `scrollHeight`, capped at 160px

### Chat History Persisted

- `chatHistory` field added to builder record via `normalizeBuilder()`
- Capped at 40 entries (~20KB worst case)
- Entries filtered to valid user/assistant messages with trimmed text
- Recap entries preserved with `kind: "recap"` and `recap` data
- `BuilderStudio` initializes from `builder.chatHistory` on mount
- Saves automatically via `useEffect` watching `history` state, piggybacking on existing autosave debounce
- **Excluded from publish** — both `file-store.js` and `postgres-store.js` strip `chatHistory` before publishing
- **Excluded from OpenAI payload** — `compactBuilder()` in `studio-chat.js` doesn't include it

### "What It Does" Portfolio Mode Added

- `getFocusAreaProjects(builder)` helper in `lib/build-taxonomy.js` groups projects by focus area
- `BuilderEcosystem.jsx` now supports `mode="what-it-does"` with a `FocusAreaGrid` component
- `MODE_META` extended with `"what-it-does"` metadata
- `PortfolioPageClient.jsx` has a mode toggle: "Capability Markers" / "What It Does"
- Focus area grid shows clickable cards with project counts and build names

### Docs Updated

- `PROJECT.md` replaced with a short pointer to `CLAUDE.md` + `HANDOFF.md` plus quick-start commands

## Current Architecture

### Frontend

- `app/studio/page.js` — studio entry point
- `components/StudioShell.jsx` — studio shell/layout with autosave
- `src/components/BuilderStudio.jsx` — main chat-first builder experience (Chat, What Chuckie Knows, Studio tabs)
- `src/components/BuilderSetup.jsx` — structured project editor (secondary)
- `components/PublicRepClient.jsx` — public rep page with viewer chat
- `components/PortfolioPageClient.jsx` — portfolio map with mode toggle
- `components/BuilderEcosystem.jsx` — ecosystem view (capability markers + what-it-does modes)

### Backend

- `app/api/studio/chat/route.js` — studio chat API (context/projectId contract)
- `app/api/public/chat/route.js` — public chat API
- `lib/server/chat.js` — thin router delegating to handler modules
- `lib/server/openai-client.js` — OpenAI API wrapper
- `lib/server/studio-chat.js` — studio chat handler, schemas, fallbacks
- `lib/server/viewer-chat.js` — viewer chat handler, schemas, fallbacks
- `lib/server/interview-engine.js` — hidden interview planner with topic coverage, question bank, stale detection
- `lib/server/store.js` — persistence layer (file or Postgres)
- `lib/server/builder.js` — builder normalization including chatHistory
- `lib/builder-profile.js` — profile utilities, signal detection, recap building
- `lib/build-taxonomy.js` — build types, focus areas, capabilities, focus area grouping
- `lib/radar.js` — radar axis data, build type normalization

### Test Suite

- `vitest.config.js` — vitest config with `@` alias
- `tests/builder-profile.test.js` — 26 tests
- `tests/builder-normalization.test.js` — 5 tests
- `tests/build-taxonomy.test.js` — 15 tests
- `tests/studio-chat.test.js` — 5 tests
- `tests/viewer-chat.test.js` — 4 tests
- `tests/interview-engine.test.js` — 21 tests
- `tests/chat-persistence.test.js` — 6 tests
- `tests/focus-area-projects.test.js` — 5 tests

## Verification

```
npm run build  ✓ clean
npm run test   ✓ 87 tests passing
```

## What Remains

### High Priority

- **GitHub ingestion** — auto-populate builds from connected GitHub repos
- **Anthropic API migration** — swap OpenAI backend for Anthropic API
- **Push notifications** — proactive re-engagement from Chuckie

### Medium Priority

- **Lattice visualization** — capability coverage across all builds
- **Featured projects gallery** — builder selects up to 3 featured projects
- **Build timeline** — visual display of when things were built
- **"Talk to Chuckie about this"** entry points on each project in public rep

### Lower Priority

- **Builder statement** — short personal text on profile
- **Lint setup** — ESLint for consistent code quality
- **E2E tests** — browser-based testing for critical flows
