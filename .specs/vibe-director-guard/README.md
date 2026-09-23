# Vibe Director Anti-Slop Guard

Status: APPROVED

## Overview
Vibe Director Anti-Slop Guard is an installable OMP plugin and runtime extension (`omp-vibe-kit`) that enforces a strict four-phase engineering workflow in Vibe Mode (`/vibe`):
1. Phase 1: Reconnaissance (spawn fast scout to explore code)
2. Phase 2: Adversarial Audit (Director inspects files via `read` to eliminate hallucinations)
3. Phase 3: Master-TODO Synthesis (Director digests verified findings into parent `todo(op="init")`)
4. Phase 4: Grounded Execution Dispatch (spawns execution worker with structured brief)

## Problem Statement
Standard Vibe Mode prompts the Director to immediately delegate tasks without preliminary codebase discovery. Stripped discovery tools (`grep`, `glob`) and missing brief validation cause workers to receive vague, speculative prompts, burning tokens on exploratory loops and introducing architectural slop.

## Architecture
- `pi.on("context")`: Rewrites `vibe-mode-context` message with the 4-phase Zero-Slop Execution Pipeline.
- `pi.on("tool_call")`: Monitors Director actions; tracks `read` calls; permits recon `vibe_spawn`; enforces preflight quality checks on implementation `vibe_spawn`.
- Package layout: Standalone OMP extension installable via git ref or marketplace in `~/.omp/plugins/package.json`.
