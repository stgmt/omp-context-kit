# Acceptance Criteria

## AC1
- Given an active session in Vibe Mode
- When the `context` event fires before an LLM call
- Then the `vibe-mode-context` content includes the Zero-Slop Execution Pipeline and instructs Phase 4 to author all six standalone headings: `## Goal`, `## Done when`, `## Scope / Non-goals`, `## Evidence`, `## Checkpoint`, and `## Dependencies`.

## AC2
- Given a Director session
- When the Director executes a `read` tool call
- Then the internal verified read counter increments.

## AC3
- Given a Director with a valid six-section brief and a reconnaissance worker such as `recon-auth` using `cli: "fast"`
- When `vibe_spawn` is called without implementation reads, target-path intersection, or Master-TODO initialization
- Then the tool call is allowed only after the brief contract passes, and the scout bypasses only implementation-specific gates.

## AC4
- Given a Director with a complete valid brief but zero verified file reads
- When a non-scout calls `vibe_spawn` with `cli: "good"`
- Then the call is blocked with `SLOP_GUARD_BLOCKED` and identifies the missing read gate.

## AC5
- Given a Director with a complete valid brief, a verified read intersecting a cited target, and Master-TODO initialized or started
- When a non-scout calls `vibe_spawn` with `cli: "good"`
- Then the tool call is permitted.

## AC6
- Given any `vibe_spawn` request, including a reconnaissance scout
- When a required brief section is missing, duplicated, empty, or contains a recognized placeholder, the Checkpoint is invalid, or the Dependencies-only `None` rule is violated
- Then the guard blocks before scout bypass, lists each failed criterion, names the affected section, and tells the Director what to author or correct.
- And the guard does not insert missing headings or fill any brief body automatically.

## AC7
- Given a valid brief whose recognized headings vary only in case or repeated whitespace
- When the brief is validated
- Then each heading is matched to its canonical section and remains valid.

## AC8
- Given the package has been built and `bun run install-global` has completed
- When OMP discovers the plugin in the default scope and each named profile present at installation
- Then every profile resolves the installed package and its built `dist/extension.js` entrypoint without a per-profile TypeScript copy.
