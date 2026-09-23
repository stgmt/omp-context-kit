Feature: Vibe Director Anti-Slop Guard

  @id:SCEN-vibe-director-guard-context-rewrite
  Scenario: Context event replaces default vibe prompt with anti-slop pipeline
    Given an active agent session in Vibe Mode
    When the context event fires before sending messages to the LLM
    Then the vibe-mode-context message content contains "Zero-Slop Execution Pipeline"

  @id:SCEN-vibe-director-guard-recon-allowed
  Scenario: Reconnaissance scout spawn is permitted immediately
    Given a Director in Vibe Mode
    When the Director calls vibe_spawn with cli "fast" and name "recon-api"
    Then the tool call is permitted without blocking

  @id:SCEN-vibe-director-guard-recon-negative-constraint
  Scenario: Reconnaissance scout with negative constraint is permitted
    Given a Director in Vibe Mode
    When the Director calls vibe_spawn with cli "fast" and prompt containing "do not build"
    Then the tool call is permitted without blocking

  @id:SCEN-vibe-director-guard-impl-blocked-no-read
  Scenario: Implementation worker is blocked when director did not inspect files
    Given a Director who has performed zero read operations
    When the Director calls vibe_spawn with cli "good"
    Then the tool call is blocked with reason starting with "SLOP_GUARD_BLOCKED"

  @id:SCEN-vibe-director-guard-impl-allowed-with-grounded-brief
  Scenario: Implementation worker is allowed when director verified files and authored structured brief
    Given a Director who has performed at least one read operation
    When the Director calls vibe_spawn with cli "good" citing concrete file paths and structured sections
    Then the tool call is permitted without blocking
