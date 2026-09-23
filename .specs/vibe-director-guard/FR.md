# Functional Requirements

## FR1 — Vibe Context Dynamic Rewriting
The extension SHALL intercept `context` events and replace the content of any message with `customType: "vibe-mode-context"` with the Zero-Slop Execution Pipeline instructions.

## FR2 — Director Read-State Tracking
The extension SHALL monitor `tool_call` events for the `read` tool and maintain a session-scoped counter of verified file reads performed by the Director.

## FR3 — Recon Scout Spawn Passthrough
The extension SHALL permit immediate execution of `vibe_spawn` without file path extension requirements or structured brief gating when:
- The worker is named with a reconnaissance prefix (`recon-*`, `scout-*`, `search-*`, `audit-*`, `inspect-*`), OR
- The prompt opens with an explicit reconnaissance declaration (`RECON:`, `SCOUT:`, `SEARCH:`), OR
- The worker is configured with `cli: "fast"` and contains reconnaissance keywords in the name or prompt without builder role indicators (`build`, `impl`, `patch`, `core`, `refactor`).
Negative constraints in prompt prose (such as "do not build" or "no fixes") and feature/branch names (such as "prompt-refusal-rewrite") SHALL NOT invalidate reconnaissance classification.

## FR4 — Implementation Worker Preflight Gating
The extension SHALL block `vibe_spawn` calls for implementation workers (`cli: "good"` or non-recon tasks) if:
- The Director has performed 0 `read` tool calls in the active session.
- The brief lacks concrete file paths matching standard filesystem path patterns.
- The brief contains fewer than two structural specification section headers.

## FR5 — Global Profile Deployment
The extension SHALL be deployable across the user root (`~/.omp/agent/extensions`) and all profile agent directories (`~/.omp/profiles/*/agent/extensions`).

## FR6 — Actionable Rejection Feedback
When `vibe_spawn` is blocked, the extension SHALL return an actionable failure reason specifying exactly which preflight criteria failed and how to resolve it.
