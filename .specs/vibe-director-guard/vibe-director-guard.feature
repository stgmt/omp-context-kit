Feature: Vibe Director Anti-Slop Guard
  @id:SCEN-vibe-director-guard-context-rewrite-001
  Scenario: Context event replaces default vibe prompt with anti-slop pipeline
    Given an active agent session in Vibe Mode
    When the context event fires before sending messages to the LLM
    Then the vibe-mode-context message content contains "Zero-Slop Execution Pipeline"
    And Phase 4 requires all six standalone brief headings
  @id:SCEN-vibe-director-guard-recon-allowed-002
  Scenario: Reconnaissance scout is permitted only after the brief contract passes
    Given a Director in Vibe Mode with a valid brief containing all six required sections
    When the Director calls vibe_spawn with cli "fast" and name "recon-api" without implementation reads or todo initialization
    Then the tool call is permitted without blocking
    And the brief contract is checked before implementation-gate bypass
  @id:SCEN-vibe-director-guard-recon-negative-constraint-003
  Scenario: Negative constraints do not disable an otherwise valid reconnaissance scout
    Given a Director in Vibe Mode with a valid six-section brief
    When the Director calls vibe_spawn with cli "fast", name "recon-api", and prompt containing "do not build"
    Then the tool call is permitted without blocking
    And the reconnaissance name remains a valid scout signal
  @id:SCEN-vibe-director-guard-impl-blocked-no-read-004
  Scenario: Implementation worker is blocked when director did not inspect files
    Given a Director with a valid six-section brief and zero verified file reads
    When the Director calls vibe_spawn with cli "good"
    Then the tool call is blocked with reason starting with "SLOP_GUARD_BLOCKED"
    And the reason identifies the missing read gate
  @id:SCEN-vibe-director-guard-impl-allowed-with-grounded-brief-005
  Scenario: Implementation worker is allowed when director verified files and authored a complete brief
    Given a Director who read a target file cited under Scope / Non-goals
    And the Director initialized or started Master-TODO
    And the brief contains all six unique nonempty required sections
    When the Director calls vibe_spawn with cli "good"
    Then the tool call is permitted without blocking
  @id:SCEN-vibe-director-guard-brief-missing-section-006
  Scenario: Missing required section blocks even a reconnaissance scout
    Given a Director with a brief missing the Evidence section
    When the Director calls vibe_spawn with cli "fast" and name "recon-api"
    Then the tool call is blocked before scout bypass
    And the reason identifies "Missing ## Evidence"
  @id:SCEN-vibe-director-guard-brief-empty-section-007
  Scenario: Empty required section blocks implementation dispatch
    Given a brief whose Scope / Non-goals section has no content
    When the Director calls vibe_spawn with cli "good"
    Then the tool call is blocked
    And the reason identifies the empty Scope / Non-goals section
  @id:SCEN-vibe-director-guard-brief-placeholder-008
  Scenario: Placeholder content blocks implementation dispatch
    Given a brief whose Done when section contains "TBD"
    When the Director calls vibe_spawn with cli "good"
    Then the tool call is blocked
    And the reason identifies the placeholder section
  @id:SCEN-vibe-director-guard-brief-duplicate-section-009
  Scenario: Duplicate normalized heading blocks implementation dispatch
    Given a brief containing two Goal sections
    When the Director calls vibe_spawn with cli "good"
    Then the tool call is blocked
    And the reason identifies "Duplicate ## Goal"
  @id:SCEN-vibe-director-guard-brief-normalized-headings-010
  Scenario: Case and repeated whitespace in recognized headings are accepted
    Given a valid brief with headings "## goal" and "## DONE   WHEN"
    And the Director read a target cited by Scope / Non-goals and initialized Master-TODO
    When the Director calls vibe_spawn with cli "good"
    Then the tool call is permitted without blocking
  @id:SCEN-vibe-director-guard-none-dependencies-011
  Scenario: None is accepted as the sole Dependencies content
    Given a valid brief whose Dependencies section contains only "None"
    And the Director read a target cited by Scope / Non-goals and initialized Master-TODO
    When the Director calls vibe_spawn with cli "good"
    Then the tool call is permitted without blocking
  @id:SCEN-vibe-director-guard-none-outside-dependencies-012
  Scenario: None is rejected outside Dependencies
    Given a brief whose Goal section contains only "None"
    When the Director calls vibe_spawn with cli "good"
    Then the tool call is blocked
    And the reason identifies the invalid Goal content
  @id:SCEN-vibe-director-guard-none-mixed-dependencies-013
  Scenario: None cannot be mixed with real dependencies
    Given a brief whose Dependencies section contains "None" and a runtime dependency
    When the Director calls vibe_spawn with cli "good"
    Then the tool call is blocked
    And the reason identifies the invalid Dependencies content
