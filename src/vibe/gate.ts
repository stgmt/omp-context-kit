import type { ExtensionAPI } from "../types.js";
import { isReconScout } from "./classifier.js";
import { VIBE_MODE_ACTIVE_SYSTEM_PROMPT } from "./prompt.js";

/** Concrete file path with extension; POSIX and Windows backslashes. */
export const FILE_PATH_RE = /[a-zA-Z0-9_\-\.\\/]+\.[a-zA-Z0-9]{1,6}/;
/** Structured brief section headers (## Target Files, ## Current Contract, ...). */
export const STRUCTURAL_HEADER_RE = /#+\s*(target|contract|change|delta|acceptance|non-goal|verification)/gi;

/**
 * Attaches the Vibe Director Anti-Slop Guard to the extension event bus.
 *
 * Enforces a strict 4-phase engineering protocol for OMP Vibe Mode:
 * Phase 1: Reconnaissance (spawn fast scout)
 * Phase 2: Adversarial Audit (Director inspects files via `read` to eliminate hallucinations)
 * Phase 3: Master-TODO Synthesis (Director digests verified findings into parent `todo(op="init")`)
 * Phase 4: Grounded Execution Dispatch (spawns execution worker with structured brief)
 */
export function attachVibeGuard(pi: ExtensionAPI): void {
	// Session-scoped state tracking
	let directorReadCount = 0;
	let todoInitialized = false;

	// 1. Rewrite vibe-mode-context in LLM messages
	pi.on("context", async (event) => {
		if (!Array.isArray(event.messages)) return;
		const vibeMsg = event.messages.find((m) => m && m.role === "custom" && m.customType === "vibe-mode-context");
		if (!vibeMsg) return;

		vibeMsg.content = VIBE_MODE_ACTIVE_SYSTEM_PROMPT;
		return { messages: event.messages };
	});

	// 2. Track Director operations and enforce gates
	pi.on("tool_call", async (event) => {
		// Non-vibe and non-spawn tools pass through completely unmodified
		if (event.toolName === "read") {
			directorReadCount++;
			return;
		}

		if (event.toolName === "todo") {
			const op = (event.input as { op?: unknown } | undefined)?.op;
			if (op === "init") {
				todoInitialized = true;
			}
			return;
		}

		// Only vibe_spawn is subjected to preflight gates
		if (event.toolName === "vibe_spawn") {
			const input = (event.input && typeof event.input === "object" ? event.input : {}) as Record<string, unknown>;
			const rawCli = typeof input.cli === "string" ? input.cli : "good";
			const prompt = typeof input.prompt === "string" ? input.prompt : "";
			const name = typeof input.name === "string" ? input.name : "";

			// Recon scouts are allowed immediately to explore without rigid brief schemas
			if (isReconScout(rawCli, name, prompt)) {
				return;
			}

			// Implementation worker validation
			// Gate 1: Director must have inspected files personally
			if (directorReadCount === 0) {
				return {
					block: true,
					reason:
						"SLOP_GUARD_BLOCKED: Director has not read or verified any repository files! " +
						"You MUST complete Phase 1 (recon scout via 'fast' worker) and Phase 2 (personally inspect files via 'read' " +
						"to verify architecture and eliminate hallucinations) before spawning an implementation worker. " +
						"Hint: If this was intended as a recon scout, name it 'recon-<topic>' or set prompt: 'RECON: ...'.",
				};
			}

			// Gate 2: Brief must cite concrete file paths (handles POSIX and Windows backslashes)
			if (!FILE_PATH_RE.test(prompt)) {
				return {
					block: true,
					reason:
						"SLOP_GUARD_BLOCKED: Implementation brief lacks concrete file paths! " +
						"Do not delegate vague tasks. Specify exact ## Target Files verified on disk. " +
						"Hint: If this was intended as a recon scout, name it 'recon-<topic>'.",
				};
			}

			// Gate 3: Brief structure check (at least 2 sections from Target/Contract/Change/Acceptance/Non-Goals)
			const sectionMatches = prompt.match(STRUCTURAL_HEADER_RE);
			const sectionCount = sectionMatches ? sectionMatches.length : 0;
			if (sectionCount < 2) {
				return {
					block: true,
					reason:
						"SLOP_GUARD_BLOCKED: Implementation brief lacks structured specification. " +
						"Brief MUST contain structured sections: ## Target Files, ## Current Contract, ## Required Delta, and ## Acceptance Criteria. " +
						"Hint: If this was intended as a recon scout, name it 'recon-<topic>'.",
				};
			}
		}
	});
}
