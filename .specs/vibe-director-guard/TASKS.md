# Tasks

## TASK-1: Design Vibe Director Guard Architecture
Design the 4-phase protocol, extension event lifecycle, and preflight validation rules.

## TASK-2: Implement Global Extension
Implement `vibe-director-guard.ts` with `context` and `tool_call` handlers.

## TASK-3: Deploy Globally Across Profiles
Install the extension into `~/.omp/agent/extensions` and all active profile roots.

## TASK-4: Author In-Process Smoke Tests
Create automated Bun smoke tests verifying context rewriting, recon passthrough, and implementation gating.

## TASK-5: Author Spec Kit Specification
Create canonical feature specifications and Gherkin scenarios in `omp-context-kit`.

## TASK-6: Harden Recon Classification against Forensic Traps
Update classifier to handle negative constraints and worktree target paths without false-positive blocking.
