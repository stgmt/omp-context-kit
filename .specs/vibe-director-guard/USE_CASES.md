# Use Cases

## UC1: Exploratory Reconnaissance
- Primary Actor: Director Agent.
- Trigger: User asks for a broad refactor or architectural change.
- Flow:
  1. Director authors a complete six-section brief for the reconnaissance task.
  2. Director calls `vibe_spawn` with `cli: "fast"` and name `recon-<topic>`.
  3. Guard validates the brief before classifying the call as a scout.
  4. After validation, the scout bypasses implementation-only read, path, read-intersection, and Master-TODO checks.
  5. Scout scans the repository and returns verified paths and signatures.
## UC2: Preflight Rejection of Blind Delegation
- Primary Actor: Director Agent.
- Trigger: Director attempts to spawn an implementation worker without reading files, while providing an otherwise valid six-section brief.
- Flow:
  1. Guard validates the brief contract.
  2. Guard detects `directorReadCount === 0` and blocks tool execution with `SLOP_GUARD_BLOCKED`.
  3. Rejection feedback names the missing read gate and directs the Director to inspect relevant files.
## UC3: Gated Implementation Dispatch
- Primary Actor: Director Agent.
- Trigger: Director dispatches an implementation worker after inspecting its target.
- Flow:
  1. Director calls `read` on the target files to verify contracts.
  2. Director calls `todo(op="init")` or `todo(op="start")` to digest the plan.
  3. Director authors all six required sections: `Goal`, `Done when`, `Scope / Non-goals`, `Evidence`, `Checkpoint`, and `Dependencies`.
  4. The `Scope / Non-goals` section cites at least one target that intersects a verified read.
  5. Director calls `vibe_spawn` with the complete brief.
  6. Guard validates the brief first, then applies read, concrete-path, targeted-read-intersection, and Master-TODO gates before permitting launch.