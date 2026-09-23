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
A valid implementation brief MUST contain at least two of the following headings:
- `## Target Files`: List of file paths verified on disk.
- `## Current Contract`: Signatures and interfaces.
- `## Required Delta`: Specific behavioral changes.
- `## Acceptance Criteria`: Verification commands.
