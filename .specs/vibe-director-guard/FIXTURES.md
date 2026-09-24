# Fixtures and Test Data

## Real Session Traces
- `session-01a0bf4b`: Refusal hardcut session illustrating `IMPLEMENT_ACTION_RE` keyword collision trap on negative constraints (`do not build`, `prompt rewrite`).
- `session-01a0c82f`: Multi-scout parallel fanout session demonstrating scout unblocking and implementation gating.

## Synthetic Test Fixtures
- `blind-spawn-input`: High-level prompt lacking file paths and contract details.
- `grounded-brief-input`: Valid brief with one nonempty `Goal`, `Done when`, `Scope / Non-goals`, `Evidence`, `Checkpoint`, and `Dependencies` section; targets cite verified filesystem paths and the checkpoint gives a positive elapsed duration.
- `disguised-recon-input`: Fast CLI call containing implementation verbs without reconnaissance intent.
