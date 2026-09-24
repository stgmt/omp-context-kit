# Vibe Director Guard Schema

## Tool Call Interception Payload
```json
{
  "toolName": "vibe_spawn",
  "input": {
    "cli": "fast | good",
    "name": "string",
    "prompt": "string"
  }
}
```

## Guard Return Payload
```json
{
  "block": true,
  "reason": "SLOP_GUARD_BLOCKED: <actionable feedback>"
}
```

## Implementation Brief Markdown Contract
A valid implementation brief MUST contain exactly one level-two section for each heading below. The guard matches heading names case-insensitively and collapses repeated whitespace, but duplicate normalized headings are invalid:
- `## Goal`: Concrete objective and intended outcome.
- `## Done when`: Observable completion conditions.
- `## Scope / Non-goals`: In-scope files or work and explicit boundaries.
- `## Evidence`: Checks or observations that will prove the result.
- `## Checkpoint`: A positive elapsed-time checkpoint after dispatch (for example, `15m`).
- `## Dependencies`: Required prerequisites, or `None` as the section sole content.
Each body MUST contain non-whitespace content and MUST NOT contain a recognized placeholder marker such as `TODO`, `TBD`, `to be determined`, `fill in`, `insert here`, `<placeholder>`, or `[placeholder]`. The check targets explicit placeholder markers; ordinary TypeScript generics and markup are not placeholders.
`None` in any section other than `Dependencies`, or `None` mixed with other dependency content, is invalid.
The contract is checked on every `vibe_spawn` call before reconnaissance classification. Reconnaissance scouts still need the complete brief; they bypass only implementation-specific read, path, read-intersection, and Master-TODO checks. Incomplete briefs are blocked with section-specific feedback and are never auto-filled.