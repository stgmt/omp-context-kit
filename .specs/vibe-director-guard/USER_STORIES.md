# User Stories

## US1: Architect Directing Codebase Exploration
As a developer using `/vibe`,
I want the Director to validate a complete six-section brief before dispatching a reconnaissance scout, then let a valid scout skip only implementation-specific gates,
So that exploration remains lightweight without allowing incomplete or speculative worker instructions.
## US2: Elimination of Hallucinated Implementation Tasks
As a developer using `/vibe`,
I want the Director to be physically prevented from delegating implementation tasks to workers before personally inspecting the code,
So that workers never receive hallucinated or speculative specifications.

## US3: Grounded Implementation Execution
As a developer reviewing Vibe worker output,
I want each implementation worker to receive a complete brief with the required Goal, Done when, Scope / Non-goals, Evidence, Checkpoint, and Dependencies sections, grounded in verified file paths and current contracts,
So that code edits are targeted, correct, and avoid collateral breakage.
## US4: Non-Intrusive Workflow
As a developer using non-vibe modes (Plan mode, Goal mode, or standard chat),
I want the plugin to remain completely passive,
So that my normal tool execution is never blocked or altered.
