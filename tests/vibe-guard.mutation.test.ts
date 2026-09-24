import { describe, expect, test } from "bun:test";
import ompVibeKit from "../src/index.js";
import { isReconScout } from "../src/vibe/classifier.js";
import { basenameOf, extractCitedPaths, FILE_PATH_RE, normalizeReadPath } from "../src/vibe/gate.js";
import type { ExtensionAPI, ToolCallBlock, ToolCallHandler } from "../src/types.js";

/**
 * Mutation battery: each test re-implements the gate with exactly one check
 * deleted and proves the mutant flips a blocked call into an allowed one.
 * If a check can be removed without changing behavior, it is dead weight —
 * these tests pin it as load-bearing.
 */

interface GateToggles {
	checkReads?: boolean;
	checkPaths?: boolean;
	checkIntersection?: boolean;
	checkTodo?: boolean;
	checkWorkerContract?: boolean;
	checkBuilderName?: boolean;
	checkBriefDuplicates?: boolean;
	normalizeBriefHeadings?: boolean;
	checkBriefBodies?: boolean;
	checkBriefPlaceholders?: boolean;
	checkDependenciesNoneRule?: boolean;
}

/** Faithful re-implementation of attachVibeGuard's tool_call path with kill switches. */
function makeMutantToolCall(toggles: GateToggles): ToolCallHandler {
	const readPaths = new Set<string>();
	let todoInitialized = false;
	return async (event) => {
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
			if (op === "init" || op === "start") todoInitialized = true;
			return;
		}
		if (event.toolName !== "vibe_spawn") return;

		const input = (event.input && typeof event.input === "object" ? event.input : {}) as Record<string, unknown>;
		const rawCli = typeof input.cli === "string" ? input.cli : "good";
		const prompt = typeof input.prompt === "string" ? input.prompt : "";
		const name = typeof input.name === "string" ? input.name : "";

		if (toggles.checkWorkerContract !== false && !hasValidWorkerBrief(prompt, toggles)) {
			return { block: true, reason: "SLOP_GUARD_BLOCKED: invalid worker brief contract" } satisfies ToolCallBlock;
		}
		// Mutant: builder-name filter removed from the classifier
		const recon = toggles.checkBuilderName === false ? isReconScoutNoBuilderFilter(rawCli, name, prompt) : isReconScout(rawCli, name, prompt);
		if (recon) return;

		if (toggles.checkReads !== false && readPaths.size === 0) {
			return { block: true, reason: "SLOP_GUARD_BLOCKED: no reads" } satisfies ToolCallBlock;
		}
		if (toggles.checkPaths !== false && !FILE_PATH_RE.test(prompt)) {
			return { block: true, reason: "SLOP_GUARD_BLOCKED: no paths" } satisfies ToolCallBlock;
		}
		if (toggles.checkIntersection !== false) {
			const cited = extractCitedPaths(prompt);
			if (!cited.some((c) => readPaths.has(c) || readPaths.has(basenameOf(c)))) {
				return { block: true, reason: "SLOP_GUARD_BLOCKED: cited files not read" } satisfies ToolCallBlock;
			}
		}
		if (toggles.checkTodo !== false && !todoInitialized) {
			return { block: true, reason: "SLOP_GUARD_BLOCKED: no todo" } satisfies ToolCallBlock;
		}
		return;
	};
}

/** isReconScout with the builder-name exclusion deleted (Tier 3 unfiltered). */
function isReconScoutNoBuilderFilter(cli: string, name: string, prompt: string): boolean {
	const nameClean = name.toLowerCase().trim();
	const promptClean = prompt.trim();
	if (/^(recon|scout|search|audit|inspect)/.test(nameClean)) return true;
	if (/^\s*(RECON|SCOUT|SEARCH|AUDIT|DISCOVERY|INVESTIGATE)\b/i.test(promptClean)) return true;
	if (cli.toLowerCase().trim() === "fast") {
		const kw = /\b(recon|scout|search|audit|find|explore|locate|investigate|inspect|census)\b/i;
		if (kw.test(nameClean) || kw.test(promptClean.slice(0, 300))) return true;
	}
	return false;
}

function realToolCall(): ToolCallHandler {
	const handlers: { toolCall?: ToolCallHandler } = {};
	const pi: ExtensionAPI = {
		on(event: string, handler: never) {
			if (event === "tool_call") handlers.toolCall = handler as ToolCallHandler;
		},
	};
	ompVibeKit(pi);
	if (!handlers.toolCall) throw new Error("tool_call hook not registered");
	return handlers.toolCall;
}

const WORKER_BRIEF_SECTIONS = [
	["Goal", "Implement the scoped change."],
	["Done when", "The requested behavior is observable and verified."],
	["Scope / Non-goals", "In scope: src/vibe/gate.ts; avoid unrelated changes."],
	["Evidence", "Return the behavior checked and its result."],
	["Checkpoint", "15m after spawn."],
	["Dependencies", "None"],
] as const;
type WorkerBriefHeading = (typeof WORKER_BRIEF_SECTIONS)[number][0];

function workerBrief(scope: string, omit?: WorkerBriefHeading, goal = "Implement the scoped change."): string {
	return WORKER_BRIEF_SECTIONS.filter(([heading]) => heading !== omit)
		.map(([heading, defaultBody]) => {
			const body = heading === "Goal" ? goal : heading === "Scope / Non-goals" ? scope : defaultBody;
			return "## " + heading + "\n" + body;
		})
		.join("\n\n");
}

function hasValidWorkerBrief(prompt: string, toggles: GateToggles = {}): boolean {
	const lines = prompt.split(/\r?\n/);
	for (const [heading] of WORKER_BRIEF_SECTIONS) {
		const expected = toggles.normalizeBriefHeadings === false ? heading : heading.toLowerCase();
		const indices = lines.flatMap((line, index) => {
			const match = /^##[ \t]+(.+?)\s*$/.exec(line.trim());
			if (!match) return [];
			const rawHeading = (match[1] ?? "").trim();
			const actual = toggles.normalizeBriefHeadings === false ? rawHeading : rawHeading.replace(/\s+/g, " ").toLowerCase();
			return actual === expected ? [index] : [];
		});
		if (indices.length === 0 || (toggles.checkBriefDuplicates !== false && indices.length !== 1)) return false;
		const start = indices[0]! + 1;
		const nextSection = lines.slice(start).findIndex((line) => /^##[ \t]+/.test(line));
		const end = nextSection < 0 ? lines.length : start + nextSection;
		const bodyLines = lines.slice(start, end).map((line) => line.trim()).filter(Boolean);
		if (toggles.checkBriefBodies !== false && bodyLines.length === 0) return false;
		const content = bodyLines.map((line) => line.replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, "").trim());
		const placeholderPattern = /(?:\bTBD\b|\bTODO(?=\s*[:.]|\s*$)|\bto be determined\b|\bfill(?: this)? in\b|\binsert here\b|<(?:placeholder|todo|tbd)\b[^>\r\n]*>|<(?:your|insert|fill(?:\s+in)?)\b[^>\r\n]*>|\[(?:placeholder|fill(?:\s+in)?|todo|tbd)[^\]]*\])/i;
		if (toggles.checkBriefPlaceholders !== false && content.some((line) => placeholderPattern.test(line))) return false;
		if (toggles.checkDependenciesNoneRule !== false) {
			const noneLines = content.filter((line) => /^none[.!]?$/i.test(line));
			if (noneLines.length > 0 && (heading !== "Dependencies" || content.length !== 1 || noneLines.length !== 1)) return false;
		}
		if (heading === "Checkpoint" && !/\b[1-9]\d*\s*(?:s|sec(?:ond)?s?|m|min(?:ute)?s?|h|hours?)\b/i.test(bodyLines.join(" "))) return false;
	}
	return true;
}

const IMPL_BRIEF = workerBrief("src/vibe/gate.ts");

/** Drives a handler through reads + todo so every gate except the mutated one passes. */
async function satisfyGates(handler: ToolCallHandler, readPath = "src/vibe/gate.ts") {
	await handler({ toolName: "read", input: { path: readPath } });
	await handler({ toolName: "todo", input: { op: "init", list: ["a"] } });
}

describe("mutation — every gate check is load-bearing", () => {
	test("M1: removing the read-count check lets an unverified Director dispatch", async () => {
		const real = realToolCall();
		const blocked = await real({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-x", prompt: IMPL_BRIEF } });
		expect(blocked?.block).toBe(true);

		const mutant = makeMutantToolCall({ checkReads: false, checkIntersection: false });
		await mutant({ toolName: "todo", input: { op: "init", list: ["a"] } });
		const allowed = await mutant({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-x", prompt: IMPL_BRIEF } });
		expect(allowed).toBeUndefined();
	});

	test("M2: removing the file-path check lets a pathless brief dispatch", async () => {
		const real = realToolCall();
		await satisfyGates(real);
		const blocked = await real({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: workerBrief("No concrete repository file targets were supplied.") },
		});
		expect(blocked?.block).toBe(true);

		const mutant = makeMutantToolCall({ checkPaths: false, checkIntersection: false });
		await satisfyGates(mutant);
		const allowed = await mutant({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: workerBrief("No concrete repository file targets were supplied.") },
		});
		expect(allowed).toBeUndefined();
	});

	test("M3: removing the worker-contract gate lets a brief without Checkpoint dispatch", async () => {
		const real = realToolCall();
		await satisfyGates(real);
		const blocked = await real({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: workerBrief("src/vibe/gate.ts", "Checkpoint") },
		});
		expect(blocked?.block).toBe(true);

		const mutant = makeMutantToolCall({ checkWorkerContract: false });
		await satisfyGates(mutant);
		const allowed = await mutant({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: workerBrief("src/vibe/gate.ts", "Checkpoint") },
		});
		expect(allowed).toBeUndefined();
	});

	test("M4: removing the builder-name filter misclassifies a builder as a scout", async () => {
		expect(isReconScout("fast", "core-builder", "explore the repo")).toBe(false);
		expect(isReconScoutNoBuilderFilter("fast", "core-builder", "explore the repo")).toBe(true);

		const real = realToolCall();
		const blocked = await real({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "core-builder", prompt: workerBrief("src/vibe/gate.ts", undefined, "Explore the repo then rewrite it") },
		});
		expect(blocked?.block).toBe(true);

		const mutant = makeMutantToolCall({ checkBuilderName: false });
		const allowed = await mutant({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "core-builder", prompt: workerBrief("src/vibe/gate.ts", undefined, "Explore the repo then rewrite it") },
		});
		expect(allowed).toBeUndefined();
	});

	test("M5: removing the read-intersection check lets an unread target dispatch", async () => {
		const real = realToolCall();
		await satisfyGates(real, "src/auth.ts");
		const blocked = await real({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: workerBrief("src/billing.ts") },
		});
		expect(blocked?.block).toBe(true);
		expect(blocked?.reason).toContain("None of the target files");

		const mutant = makeMutantToolCall({ checkIntersection: false });
		await satisfyGates(mutant, "src/auth.ts");
		const allowed = await mutant({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: workerBrief("src/billing.ts") },
		});
		expect(allowed).toBeUndefined();
	});

	test("M6: removing the todo gate lets an undigested Director dispatch", async () => {
		const real = realToolCall();
		await real({ toolName: "read", input: { path: "src/vibe/gate.ts" } });
		const blocked = await real({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-x", prompt: IMPL_BRIEF } });
		expect(blocked?.block).toBe(true);
		expect(blocked?.reason).toContain("Master-TODO");

		const mutant = makeMutantToolCall({ checkTodo: false });
		await mutant({ toolName: "read", input: { path: "src/vibe/gate.ts" } });
		const allowed = await mutant({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-x", prompt: IMPL_BRIEF } });
		expect(allowed).toBeUndefined();
	});

	test("M7: removing duplicate-heading rejection admits a duplicated brief", async () => {
		const prompt = workerBrief("src/vibe/gate.ts") + "\n\n## Goal\nA second outcome.";
		const real = realToolCall();
		await satisfyGates(real);
		const blocked = await real({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-duplicate-goal", prompt } });
		expect(blocked?.block).toBe(true);
		expect(blocked?.reason).toContain("Duplicate ## Goal");

		const mutant = makeMutantToolCall({ checkBriefDuplicates: false });
		await satisfyGates(mutant);
		expect(await mutant({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-duplicate-goal", prompt } })).toBeUndefined();
	});

	test("M8: removing heading normalization rejects a supported brief", async () => {
		const prompt = workerBrief("src/vibe/gate.ts")
			.replace(/^## Goal$/m, "## goal")
			.replace(/^## Done when$/m, "## DONE   WHEN");
		const real = realToolCall();
		await satisfyGates(real);
		expect(await real({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-normalized-headings", prompt } })).toBeUndefined();
		const mutant = makeMutantToolCall({ normalizeBriefHeadings: false });
		await satisfyGates(mutant);
		const blocked = await mutant({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-normalized-headings", prompt } });
		expect(blocked?.block).toBe(true);
		expect(blocked?.reason).toContain("invalid worker brief contract");
	});

	test("M9: removing empty-body rejection admits an empty required section", async () => {
		const prompt = workerBrief("In scope: src/vibe/gate.ts.", undefined, "Inspect src/vibe/gate.ts").replace("## Scope / Non-goals\nIn scope: src/vibe/gate.ts.", "## Scope / Non-goals");
		const real = realToolCall();
		await satisfyGates(real);
		expect((await real({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-empty-scope", prompt } }))?.block).toBe(true);
		const mutant = makeMutantToolCall({ checkBriefBodies: false });
		await satisfyGates(mutant);
		expect(await mutant({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-empty-scope", prompt } })).toBeUndefined();
	});

	test("M10: removing placeholder rejection admits a placeholder brief", async () => {
		const prompt = workerBrief("src/vibe/gate.ts", undefined, "TBD");
		const real = realToolCall();
		await satisfyGates(real);
		expect((await real({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-placeholder-goal", prompt } }))?.block).toBe(true);
		const mutant = makeMutantToolCall({ checkBriefPlaceholders: false });
		await satisfyGates(mutant);
		expect(await mutant({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-placeholder-goal", prompt } })).toBeUndefined();
	});

	test("M11: removing the Dependencies-only None rule admits invalid None values", async () => {
		const goalNone = workerBrief("src/vibe/gate.ts", undefined, "None");
		const mixedDependencies = workerBrief("src/vibe/gate.ts").replace("## Dependencies\nNone", "## Dependencies\nNone\nexternal runtime API");
		const real = realToolCall();
		await satisfyGates(real);
		for (const prompt of [goalNone, mixedDependencies]) {
			expect((await real({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-invalid-none", prompt } }))?.block).toBe(true);
		}
		const mutant = makeMutantToolCall({ checkDependenciesNoneRule: false });
		await satisfyGates(mutant);
		for (const prompt of [goalNone, mixedDependencies]) {
			expect(await mutant({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-invalid-none", prompt } })).toBeUndefined();
		}
	});
});
