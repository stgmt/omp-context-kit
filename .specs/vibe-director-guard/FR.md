# Functional Requirements

## FR1 — Vibe Context Dynamic Rewriting
The extension SHALL intercept `context` events and replace the content of any message with `customType: "vibe-mode-context"` with the Zero-Slop Execution Pipeline instructions.

## FR2 — Director Read-State Tracking
The extension SHALL monitor `tool_call` events for the `read` tool and maintain a session-scoped counter of verified file reads performed by the Director.

## FR3 — Recon Scout Spawn Passthrough
The extension SHALL validate the six-section implementation-brief contract on every `vibe_spawn` call before applying reconnaissance classification. A reconnaissance scout SHALL bypass only the implementation-specific read, concrete-path, targeted-read-intersection, and Master-TODO gates, and only after the brief passes validation.
Reconnaissance classification SHALL retain the existing signals:
- The worker name begins with a reconnaissance prefix (`recon-*`, `scout-*`, `search-*`, `audit-*`, `inspect-*`).
- The prompt begins with an explicit reconnaissance declaration (`RECON:`, `SCOUT:`, `SEARCH:`).
- The worker uses `cli: "fast"` and reconnaissance keywords appear in the name or first 300 prompt characters, without builder role indicators (`build`, `impl`, `patch`, `core`, `refactor`).
Negative constraints in prompt prose (such as "do not build" or "no fixes") and feature/branch names (such as "prompt-refusal-rewrite") SHALL NOT invalidate reconnaissance classification.
## FR4 — Implementation Worker Preflight Gating
Before any `vibe_spawn` call, the extension SHALL require exactly one recognized level-two section for each of the six headings: `Goal`, `Done when`, `Scope / Non-goals`, `Evidence`, `Checkpoint`, and `Dependencies`. Matching SHALL normalize heading case and repeated whitespace; duplicate normalized headings SHALL be rejected.
Each required section SHALL have non-whitespace content and SHALL NOT contain a recognized placeholder marker. `Checkpoint` SHALL state a positive elapsed duration. `Dependencies` MAY contain `None` only when it is the sole content of that section; `None` in another section or mixed with dependency details SHALL be rejected.
After the brief contract passes, every non-scout worker SHALL pass all implementation gates, regardless of CLI speed selection:
- The Director has performed at least one repository `read` call in the active session.
- The brief cites at least one concrete filesystem path.
- At least one cited target matches a recorded read path after normalization or basename matching.
- The Director has initialized or started the Master-TODO (`todo(op="init")` or `todo(op="start")`).
## FR5 — Global Profile Deployment
The extension SHALL be deployable across the user root (`~/.omp/agent/extensions`) and all profile agent directories (`~/.omp/profiles/*/agent/extensions`).

## FR6 — Actionable Rejection Feedback
When `vibe_spawn` is blocked, the extension SHALL return an actionable failure reason that lists every failed preflight criterion and identifies each missing, duplicate, empty, placeholder-filled, or otherwise invalid brief section. It SHALL say what the Director must author or correct.
The extension MUST NOT insert headings, invent section content, or otherwise repair a brief automatically; the Director must supply a valid brief before retrying.