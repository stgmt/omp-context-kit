# File Changes and Artifact Manifest

## Plugin Package Structure
- `package.json`: OMP plugin manifest and build/test/install scripts.
- `src/index.ts`: Extension entrypoint and OMP hook registration.
- `src/vibe/prompt.ts`: Vibe context instructions, including all six standalone brief headings.
- `src/vibe/gate.ts`: Deterministic `vibe_spawn` contract validation and ordered implementation gates.
- `dist/extension.js`: Built single-file extension consumed by OMP discovery and installation.
- `tests/vibe-guard.unit.test.ts`: Scout-classifier unit tests.
- `tests/vibe-guard.regression.test.ts`: Passive-tool and context-rewrite regressions.
- `tests/vibe-guard.edge.test.ts`: Contract, path, and gate boundary coverage.
- `tests/vibe-guard.e2e.test.ts`: Real ExtensionRunner loading and dispatch behavior.
- `tests/vibe-guard.mutation.test.ts`: Load-bearing gate mutation battery.

## Deployed Targets
- `bun run install-global` (`scripts/install-all-profiles.mjs`): Links the package into the default OMP user scope and each named profile present at install time.
- Installed entrypoints are resolved by OMP plugin discovery; no hard-coded per-profile TypeScript copy is required.