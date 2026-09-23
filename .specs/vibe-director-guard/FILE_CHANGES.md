# File Changes and Artifact Manifest

## Plugin Package Structure
- `package.json`: OMP plugin manifest declaring capabilities, extension entrypoint, and metadata.
- `src/extension.ts`: Core TypeScript source implementing `pi.on("context")` and `pi.on("tool_call")`.
- `dist/extension.js`: Compiled single-file bundle for zero-dependency distribution.
- `tests/vibe-guard.test.ts`: Automated 26-test regression and mutation suite.

## Deployed Targets
- `~/.omp/agent/extensions/vibe-director-guard.ts`: Default active profile extension.
- `~/.omp/profiles/*/agent/extensions/vibe-director-guard.ts`: Named profile synchronization targets (40 profiles).
