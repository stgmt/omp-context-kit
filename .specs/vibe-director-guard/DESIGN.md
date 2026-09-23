# Design: Vibe Director Anti-Slop Guard

## Component Overview
The guard is implemented as an OMP extension exporting default function `vibeDirectorGuard(pi: ExtensionAPI): void`.

## Sequences
1. `context` event handler scans `event.messages` for `customType === "vibe-mode-context"`.
2. When found, modifies `(message as any).content = VIBE_MODE_ACTIVE_SYSTEM_PROMPT`.
3. `tool_call` event handler tracks `read` calls (`directorReadCount++`).
4. `tool_call` filters `vibe_spawn`: evaluates recon heuristics (`cli === "fast"` + recon keywords). If not recon, validates `directorReadCount > 0`, regex file paths, and heading structure.

## State Lifecycle
- `IDLE`: Session initialized, `directorReadCount = 0`.
- `RECON`: Scout spawned, unblocked.
- `AUDITED`: `directorReadCount > 0`, code inspected.
- `DIGESTED`: `todo(op="init")` registered.
- `DISPATCHED`: Implementation worker launched with valid brief.
