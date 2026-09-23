# Changelog: Vibe Director Anti-Slop Plugin

## [1.1.0] - 2026-09-23
### Fixed
- Fixed false-positive reconnaissance scout blocking caused by keyword collisions on negative constraints ("do not build", "no fixes") and branch names ("prompt-refusal-rewrite").
- Implemented `isReconScout` classifier prioritizing worker naming prefixes (`recon-*`, `scout-*`) and preamble declarations.
- Permitted directory and worktree target paths without mandatory file extensions for reconnaissance scouts.

## [1.0.0] - 2026-09-23
### Added
- Initial implementation of `vibeDirectorGuard` extension.
- Dynamic rewriting of `vibe-mode-context` with 4-phase Zero-Slop Pipeline via `pi.on("context")`.
- Two-gate preflight validation for implementation workers via `pi.on("tool_call")`.
- Automated in-process smoke test suite and multi-profile deployment across 41 locations.
