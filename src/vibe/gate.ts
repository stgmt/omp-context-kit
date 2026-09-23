import type { ExtensionAPI } from "../types.js";
import { isReconScout } from "./classifier.js";
import { VIBE_MODE_ACTIVE_SYSTEM_PROMPT } from "./prompt.js";

/**
 * Concrete file path: requires a path separator (`/` or `\`) OR a recognized
 * code/doc extension. Bare dotted tokens like `5.00pm`, `v1.0`, `section 2.4`
 * must never satisfy the gate.
 */
export const FILE_PATH_RE =
	/(?:[a-zA-Z0-9_\-\.]+[\\/]+[a-zA-Z0-9_\-\.\\/]+\.[a-zA-Z0-9]{1,6}|[a-zA-Z0-9_\-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|json|md|ya?ml|rs|go|sh|bash|toml|css|html|sql|graphql|proto))\b/i;
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
	const readPaths = new Set<string>();
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
			const rawPath = (event.input as { path?: unknown } | undefined)?.path;
			if (typeof rawPath === "string" && rawPath.length > 0) {
				const normalized = normalizeReadPath(rawPath);
				readPaths.add(normalized);
				readPaths.add(basenameOf(normalized));
			}
			return;
		}

		if (event.toolName === "todo") {
			const op = (event.input as { op?: unknown } | undefined)?.op;
			if (op === "init" || op === "start") {
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
			if (readPaths.size === 0) {
				return {
					block: true,
					reason:
						"SLOP_GUARD_BLOCKED: Director has not read or verified any repository files! " +
						"You MUST complete Phase 1 (recon scout via 'fast' worker) and Phase 2 (personally inspect files via 'read' " +
						"to verify architecture and eliminate hallucinations) before spawning an implementation worker. " +
						"Hint: If this was intended as a recon scout, name it 'recon-<topic>' or set prompt: 'RECON: ...'.",
				};
			}

			// Gate 2: Brief must cite concrete file paths (separator or known extension; POSIX and Windows)
			if (!FILE_PATH_RE.test(prompt)) {
				return {
					block: true,
					reason:
						"SLOP_GUARD_BLOCKED: Implementation brief lacks concrete file paths! " +
						"Do not delegate vague tasks. Specify exact ## Target Files verified on disk. " +
						"Hint: If this was intended as a recon scout, name it 'recon-<topic>'.",
				};
			}

			// Gate 3: Targeted read intersection — at least one cited path must have been
			// personally read by the Director (full normalized path or basename match).
			const citedPaths = extractCitedPaths(prompt);
			const anyCitedRead = citedPaths.some((cited) => readPaths.has(cited) || readPaths.has(basenameOf(cited)));
			if (!anyCitedRead) {
				return {
					block: true,
					reason:
						"SLOP_GUARD_BLOCKED: None of the target files cited in the brief were inspected by the Director! " +
						"You cited target files, but have not read them. Inspect the target files via 'read' before delegating implementation.",
				};
			}

			// Gate 4: Master-TODO must be initialized (Phase 3 digest before dispatch)
			if (!todoInitialized) {
				return {
					block: true,
					reason:
						"SLOP_GUARD_BLOCKED: Master-TODO checklist has not been initialized! " +
						"You MUST complete Phase 3 by calling todo(op='init', list=[...]) to digest verified facts before spawning implementation workers.",
				};
			}

			// Gate 5: Brief structure check (at least 2 sections from Target/Contract/Change/Acceptance/Non-Goals)
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

/**
 * Normalizes a `read` tool path for intersection checks: strips line selectors
 * (`:50-100`, `:raw`, …), leading `./`, unifies separators, lowercases.
 */
export function normalizeReadPath(rawPath: string): string {
	let p = rawPath.trim();
	p = p.replace(/:[\d,\+\-]+$/, "");
	p = p.replace(/:(raw|img|conflicts)$/i, "");
	p = p.replace(/\\/g, "/");
	p = p.replace(/^\.\/+/, "");
	return p.toLowerCase();
}

/** Last path segment after separator unification. */
export function basenameOf(normalizedPath: string): string {
	const idx = normalizedPath.lastIndexOf("/");
	return idx === -1 ? normalizedPath : normalizedPath.slice(idx + 1);
}

/** Extracts and normalizes every candidate file path cited in a brief. */
export function extractCitedPaths(prompt: string): string[] {
	const matches = prompt.match(new RegExp(FILE_PATH_RE.source, "gi")) ?? [];
	return matches.map((m) => normalizeReadPath(m));
}
