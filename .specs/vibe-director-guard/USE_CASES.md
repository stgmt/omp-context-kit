# Use Cases

## UC1: Exploratory Reconnaissance
- Primary Actor: Director Agent.
- Trigger: User asks for a broad refactor or architectural change.
- Flow:
  1. Director calls `vibe_spawn` with `cli: "fast"` and name `recon-<topic>`.
  2. Guard identifies scout intent and permits immediate spawn.
  3. Scout scans repository and returns verified paths and signatures.

## UC2: Preflight Rejection of Blind Delegation
- Primary Actor: Director Agent.
- Trigger: Director attempts to spawn an implementation worker (`cli: "good"`) without reading files.
- Flow:
  1. Guard detects `directorReadCount === 0`.
  2. Guard blocks tool execution with `SLOP_GUARD_BLOCKED`.
  3. Director receives structured feedback and performs `read` operations.

## UC3: Gated Implementation Dispatch
- Primary Actor: Director Agent.
- Trigger: Director authors structured implementation brief.
- Flow:
  1. Director calls `read` on target files to verify contracts.
  2. Director calls `todo(op="init")` to digest plan.
  3. Director calls `vibe_spawn` with `## Target Files`, `## Current Contract`, `## Required Delta`, and `## Acceptance Criteria`.
  4. Guard validates requirements and permits worker launch.
