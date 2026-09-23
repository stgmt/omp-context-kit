# Non-Functional Requirements

## NFR1 — Zero Subprocess Overhead
The extension SHALL execute purely in-process via synchronous and async EventBus callbacks without spawning external CLI processes.

## NFR2 — Fail-Safe Open on Non-Vibe Operations
The extension SHALL remain inert and pass all tool calls unmodified when the tool name is not `vibe_spawn` or when the session is not operating in Vibe Mode.

## NFR3 — Idempotent Installation
Deploying the extension to multiple profile directories SHALL be idempotent and produce identical SHA-256 byte artifacts.

## NFR4 — Runtime Compatibility
The extension SHALL maintain full backward and forward compatibility with standard OMP versions from v17.3.7 onward without monkey-patching core runtime files.
