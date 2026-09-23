# Research: Vibe Director Anti-Slop Guard

## Background
In OMP v17.3.7 (`packages/coding-agent`), Vibe Mode (`/vibe`) places the main agent in a Director role driving persistent subagent workers (`fast` and `good`).

## Forensic Analysis of Failure Modes
1. Premature Delegation:
   `vibe-mode-active.md` orders `1. Split requests into independent workstreams` and `2. vibe_spawn each with a complete self-contained brief`. File reading is only mentioned in step 4 (verification).
2. Stripped Discovery Tools:
   `interactive-mode.ts:3510` restricts base tools to `["read"]` (and optionally `["todo"]`). `grep` and `glob` are removed.
3. Worker Slate Isolation:
   Workers start with an empty transcript (`Workers start blank; never see this conversation`). Vague briefs force workers into blind exploration.
4. Recon False-Positive Traps (Session `01a0bf4b` Forensics):
   In session `01a0bf4b-ab1d-74da-a5ad-e5c26bf59fb1` (turn 5789), a scout named `recon-refusal-hardcut` with prompt `"Search repository... do not build... prompt rewrite cleanup"` was erroneously blocked by the brief gate. Naive keyword matching on `build` and `rewrite` misclassified the scout as an implementation worker, creating a Catch-22 where scouts were required to know exact file paths before being launched to discover them. The fix prioritizes worker naming prefixes (`recon-*`, `scout-*`) and preamble declarations, ignoring negative constraints.

## Decision
Implement a non-destructive OMP extension that intercepts `vibe-mode-context` via `pi.on("context")` and gates `vibe_spawn` via `pi.on("tool_call")` with hardened reconnaissance classification.
