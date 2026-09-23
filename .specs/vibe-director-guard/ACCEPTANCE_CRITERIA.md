# Acceptance Criteria

## AC1
- Given an active session in Vibe Mode
- When the `context` event fires before an LLM call
- Then the `vibe-mode-context` message content contains the Zero-Slop Execution Pipeline phases.

## AC2
- Given a Director session
- When the Director executes a `read` tool call
- Then the internal verified read counter increments.

## AC3
- Given a Director attempting to spawn a reconnaissance worker with `cli: "fast"` and name `recon-auth`
- When `vibe_spawn` is called
- Then the tool call is allowed without blocking.

## AC4
- Given a Director with 0 verified file reads
- When `vibe_spawn` is called with `cli: "good"`
- Then the tool call is blocked with `SLOP_GUARD_BLOCKED`.
- Given a Director with >= 1 verified file reads and a structured brief citing concrete file paths
- When `vibe_spawn` is called with `cli: "good"`
- Then the tool call is permitted.

## AC5
- Given the deployed `vibe-director-guard.ts` across profile directories
- When computing SHA-256 hashes of all installed targets
- Then all targets yield identical SHA-256 digests.

## AC6
- Given an implementation worker blocked by the preflight gate
- When the gate returns a failure response
- Then the rejection reason includes actionable guidance on required brief sections and recon naming hints.
