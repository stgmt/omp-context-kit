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
/** Six mandatory level-two sections in every worker brief. */
const WORKER_BRIEF_SECTION_NAMES = [
	"Goal",
	"Done when",
	"Scope / Non-goals",
	"Evidence",
	"Checkpoint",
	"Dependencies",
] as const;
type WorkerBriefSection = (typeof WORKER_BRIEF_SECTION_NAMES)[number];
const WORKER_BRIEF_SECTION_BY_NORMALIZED_NAME = new Map<string, WorkerBriefSection>(
	WORKER_BRIEF_SECTION_NAMES.map((section) => [section.toLowerCase(), section] as const),
);
const PLACEHOLDER_MARKER_RE =
	/(?:\bTBD\b|(?<![\w-])TODO(?=\s*[:.]|\s*$)|\bto be determined\b|\bfill(?: this)? in\b|\binsert here\b|<(?:placeholder|todo|tbd)\b[^>\r\n]*>|<(?:your|insert|fill(?:\s+in)?)\b[^>\r\n]*>|\[(?:placeholder|fill(?:\s+in)?|todo|tbd)\b[^\]]*\])/i;
const ELAPSED_DURATION_UNIT_SOURCE =
	"(?:milliseconds?|msecs?|ms|seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h|days?|d|weeks?|wks?|wk|w|months?|mos?|mo|years?|yrs?|yr|y)";
const POSITIVE_ELAPSED_DURATION_PART_SOURCE =
	"\\d+(?:[.,]\\d+)?\\s*" +
		ELAPSED_DURATION_UNIT_SOURCE +
		"(?=$|[\\s,;:.!?)]|\\d)";
const POSITIVE_ELAPSED_DURATION_SEQUENCE_RE = new RegExp(
	"(?<![\\w.+-])" +
		POSITIVE_ELAPSED_DURATION_PART_SOURCE +
		"(?:(?:\\s*[,;:]?\\s*|\\s+and\\s*)" +
			POSITIVE_ELAPSED_DURATION_PART_SOURCE +
		")*",
	"gi",
);
const POSITIVE_ELAPSED_DURATION_PART_RE = new RegExp(
	"(\\d+(?:[.,]\\d+)?)\\s*" +
		ELAPSED_DURATION_UNIT_SOURCE +
		"(?=$|[\\s,;:.!?)]|\\d)",
	"gi",
);
const POSITIVE_DURATION_AMOUNT_RE = /[1-9]/;
const SPOKEN_POSITIVE_ELAPSED_DURATION_RE =
	/\b(?:half|quarter|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:(?:of\s+)?an?\s+)?(?:milliseconds?|seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/i;
function hasPositiveElapsedDuration(body: string): boolean {
	if (SPOKEN_POSITIVE_ELAPSED_DURATION_RE.test(body)) return true;
	for (const sequence of body.matchAll(POSITIVE_ELAPSED_DURATION_SEQUENCE_RE)) {
		for (const part of sequence[0].matchAll(POSITIVE_ELAPSED_DURATION_PART_RE)) {
			if (POSITIVE_DURATION_AMOUNT_RE.test(part[1] ?? "")) return true;
		}
	}
	return false;
}

/** Matches level-two Markdown sections so each contract body ends at the next one. */
export const STRUCTURAL_HEADER_RE = /^ {0,3}##[ \t]+([^\r\n]+?)[ \t]*$/gm;
const STRUCTURAL_HEADER_LINE_RE = new RegExp(STRUCTURAL_HEADER_RE.source);
const MARKDOWN_FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const MARKDOWN_FENCE_CLOSE_RE = /^ {0,3}(`+|~+)[ \t]*$/;

function workerBriefPlaceholderMarker(section: WorkerBriefSection, body: string): string | undefined {
	const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	const bulletlessLines = lines.map((line) => line.replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, "").trim());
	const soleNoneDependency =
		section === "Dependencies" &&
		bulletlessLines.length === 1 &&
		/^none[.!]?$/i.test(bulletlessLines[0]!);
	if (soleNoneDependency) return undefined;
	if (section === "Dependencies" && /\bnone\b/i.test(body)) return "None";
	for (const line of bulletlessLines) {
		if (/^none[.!]?$/i.test(line)) return line;
		const marker = line.match(PLACEHOLDER_MARKER_RE)?.[0];
		if (marker) return marker;
	}
	return undefined;
}

function parseWorkerBriefSections(prompt: string): Map<WorkerBriefSection, string[]> {
	const headings: Array<{ section: WorkerBriefSection; start: number; bodyStart: number }> = [];
	let fence: { marker: string; length: number } | undefined;
	let lineStart = 0;

	while (lineStart <= prompt.length) {
		const newline = prompt.indexOf("\n", lineStart);
		const lineEnd = newline < 0 ? prompt.length : newline;
		const rawLine = prompt.slice(lineStart, lineEnd);
		const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;

		if (fence) {
			const close = MARKDOWN_FENCE_CLOSE_RE.exec(line);
			if (close && close[1]![0] === fence.marker && close[1]!.length >= fence.length) {
				fence = undefined;
			}
		} else {
			const open = MARKDOWN_FENCE_OPEN_RE.exec(line);
			if (open && (open[1]![0] !== "`" || !open[2]!.includes("`"))) {
				fence = { marker: open[1]![0]!, length: open[1]!.length };
			} else {
				const match = STRUCTURAL_HEADER_LINE_RE.exec(line);
				if (match) {
					const normalized = (match[1] ?? "").trim().replace(/\s+/g, " ").toLowerCase();
					const section = WORKER_BRIEF_SECTION_BY_NORMALIZED_NAME.get(normalized);
					if (section) {
						headings.push({
							section,
							start: lineStart,
							bodyStart: newline < 0 ? prompt.length : newline + 1,
						});
					}
				}
			}
		}

		if (newline < 0) break;
		lineStart = newline + 1;
	}

	const sections = new Map<WorkerBriefSection, string[]>();
	for (const section of WORKER_BRIEF_SECTION_NAMES) sections.set(section, []);
	for (const [index, heading] of headings.entries()) {
		const bodyEnd = headings[index + 1]?.start ?? prompt.length;
		sections.get(heading.section)?.push(prompt.slice(heading.bodyStart, bodyEnd).trim());
	}
	return sections;
}

function workerBriefSectionIssues(section: WorkerBriefSection, bodies: string[]): string[] {
	if (bodies.length === 0) return ["Missing ## " + section];
	const issues: string[] = [];
	if (bodies.length > 1) issues.push("Duplicate ## " + section);
	for (const body of bodies) {
		if (!body) {
			issues.push("Empty ## " + section);
			continue;
		}
		const placeholder = workerBriefPlaceholderMarker(section, body);
		if (placeholder !== undefined) {
			const issue =
				section === "Dependencies" && /^none[.!]?$/i.test(placeholder)
					? "## Dependencies may contain None only as the sole content"
					: "## " + section + " contains placeholder content: " + JSON.stringify(placeholder);
			issues.push(issue);
		}
	}
	if (section === "Checkpoint" && bodies.some((body) => body.length > 0 && !hasPositiveElapsedDuration(body))) {
		issues.push("## Checkpoint must include a positive elapsed duration after spawn");
	}
	return issues;
}

function workerBriefContractIssues(prompt: string): string[] {
	const sections = parseWorkerBriefSections(prompt);
	return WORKER_BRIEF_SECTION_NAMES.flatMap((section) =>
		workerBriefSectionIssues(section, sections.get(section) ?? []),
	);
}

/**
 * Attaches the Vibe Director Anti-Slop Guard to the extension event bus.
 *
 * Enforces the phased OMP Vibe Mode protocol and complete worker-brief contract:
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

			// Every worker, including recon scouts, must arrive with a complete brief.
			const contractIssues = workerBriefContractIssues(prompt);
			if (contractIssues.length > 0) {
				return {
					block: true,
					reason:
						"SLOP_GUARD_BLOCKED: Worker brief contract is incomplete. Fix: " +
						contractIssues.join("; ") +
						". Complete all six sections with concrete content; do not use placeholders.",
				};
			}

			// Recon scouts still bypass implementation-specific read and todo gates.
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
						"Do not delegate vague tasks. Specify exact implementation paths under ## Scope / Non-goals, verified on disk. " +
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
