# Changelog

All notable changes to omp-context-kit are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.1] - 2026-09-23

### Fixed

- **Hardened `FILE_PATH_RE` against false positives.** The file-path gate now requires a path separator (`/` or `\`) *or* a recognized code/doc extension (`ts`, `tsx`, `js`, `jsx`, `mjs`, `cjs`, `py`, `json`, `md`, `yaml`/`yml`, `rs`, `go`, `sh`, `bash`, `toml`, `css`, `html`, `sql`, `graphql`, `proto`). Bare dotted tokens such as `5.00pm`, `v1.0`, and `section 2.4` no longer satisfy the gate.
- **Targeted read-path intersection.** The Director's `read` calls are now tracked as a normalized path set (separators unified, `./` stripped, lowercased, line selectors removed; full path + basename recorded). An implementation `vibe_spawn` is blocked unless at least one file path cited in the brief intersects the set — reading `src/auth.ts` no longer authorizes a brief that only cites `src/billing.ts`.
- **Active Master-TODO gate.** `todo(op="init")` and `todo(op="start")` now arm a real preflight gate: implementation workers are blocked until the Phase-3 checklist exists.

### Changed

- Gate order is now: verified reads → concrete file paths → cited-path/read intersection → Master-TODO initialized → ≥2 structured brief sections.
- Test pyramid expanded to 119 tests: false-positive tokens, basename/selector/`./` normalization, intersection allow/deny, and per-op TODO gating.

## [0.1.0] - 2026-09-23

### Added

- Initial release: `vibe-mode-context` prompt rewrite to the Zero-Slop Execution Pipeline.
- Prefix-first recon-scout classifier (name prefix, `RECON:` declaration, fast-tier keywords with builder-name exclusion).
- `vibe_spawn` preflight gates: verified-read count, concrete file paths, ≥2 structured brief sections.
- Multi-profile install/uninstall scripts and live `ExtensionRunner` e2e suite.
