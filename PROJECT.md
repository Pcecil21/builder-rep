# Builder Rep

Builder Rep is an agentic representative for agent system builders (ASBs).

Agent system builders are people who design, build, and orchestrate AI agents, tools, and workflows into systems that produce outcomes greater than the sum of the parts.

It helps ASBs present their work, process, judgment, and capabilities to prospective hirers in a way that is more interactive, legible, and tangible than a resume, portfolio site, or static case study.

The agent is named Chuckie, inspired by Chuckie from Good Will Hunting — the friend who shows up on your behalf, frames your value clearly, and makes sure you are properly understood.

## Core idea

Builder Rep is not primarily an evaluator, recruiter, or job board.

It is a candidate-side representative: an agent that speaks on behalf of an ASB and helps a prospective hirer understand:

- what the builder has actually built
- how they design and orchestrate agentic systems
- how they think about coordination, handoffs, and system design
- which tools, platforms, and enterprise systems they are comfortable with
- what kinds of projects they are best suited for
- where their real limits are and where they should be paired with others
- whether there is a strong fit for a conversation or engagement

## What Chuckie helps do

Chuckie helps:
- represent ASBs to prospective clients or employers
- explain past projects in context
- surface relevant examples of agentic systems and multi-agent workflows
- make a builder’s way of building tangible
- clarify strengths, limitations, and role fit
- help prospective hirers understand whether to take the next step

## Product thesis

The market for ASBs is changing quickly.

Many capable people can now build meaningful agentic systems with tools like Codex, Claude Code, and ChatGPT, even if they do not fit traditional technical hiring categories.

What matters is not just whether someone can build a single agent, but whether they can create systems of agents, tools, and workflows that work together effectively and produce outcomes greater than the sum of the parts.

At the same time, there is no great way for ASBs to show what they can do.
Resumes are weak.
Static portfolios are limited.
Traditional evaluation frameworks are unstable and premature.

Builder Rep is an AI-native alternative: a living, interactive capability interface for ASBs.

## Initial focus

Initial focus:
- helping an ASB create an interactive representation of their capabilities
- answering hirer questions about past work, orchestration approach, tools, systems, and fit
- surfacing the most relevant projects for a given opportunity
- clarifying what the builder can own directly versus where they need partners
- optionally letting hirers preview or interact with examples of the builder’s work

## Longer-term direction

Over time, Builder Rep may expand into:
- opportunity qualification
- builder / project matching
- marketplace workflows
- lightweight deal coordination
- richer capability discovery across a network of ASBs

## Runtime

The app now supports a server-side `/api/chat` route for both the viewer chat and the builder studio interview.

Environment variables:
- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional, defaults to `gpt-4.1-mini`

Local development:
- copy `.env.example` to `.env.local`
- set `OPENAI_API_KEY`
- run `npm run dev -- --host 0.0.0.0`

If no API key is present, the app falls back to mocked local behavior so the UI still works.
