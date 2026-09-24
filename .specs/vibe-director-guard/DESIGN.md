# Design: Vibe Director Anti-Slop Guard

## Component Overview
The guard is implemented as an OMP extension exporting default function `vibeDirectorGuard(pi: ExtensionAPI): void`.

## Sequences
1. `context` event handler scans `event.messages` for `customType === "vibe-mode-context"`.
2. When found, modifies `(message as any).content = VIBE_MODE_ACTIVE_SYSTEM_PROMPT`.
3. `tool_call` event handler tracks `read` calls (`directorReadCount++`).
4. `tool_call` validates the six-section brief for every `vibe_spawn` call before scout classification. Missing, duplicate, empty, or placeholder-filled sections and invalid `Checkpoint` or `Dependencies` content block the call; the guard never fills the brief.
5. After the brief passes, the guard applies the existing reconnaissance heuristics. A scout bypasses only implementation-specific read, concrete-path, targeted-read-intersection, and Master-TODO gates.
6. A non-scout passes those implementation gates in order: a verified read exists, a concrete path is cited, at least one cited path intersects the Director reads, and Master-TODO has been initialized or started.

## State Lifecycle
- `IDLE`: Session initialized, `directorReadCount = 0`.
- `RECON`: Scout spawned only after the brief contract passes; implementation-only gates are bypassed.
- `AUDITED`: `directorReadCount > 0`, code inspected.
- `DIGESTED`: Master-TODO has been initialized or started.
- `DISPATCHED`: Implementation worker launched only after the brief contract and all implementation gates pass.
