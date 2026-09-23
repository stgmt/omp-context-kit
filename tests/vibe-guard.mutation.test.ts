import { describe, expect, test } from "bun:test";
import ompVibeKit from "../src/index.js";
import { isReconScout } from "../src/vibe/classifier.js";
import { FILE_PATH_RE, STRUCTURAL_HEADER_RE } from "../src/vibe/gate.js";
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
	checkSections?: boolean;
	checkBuilderName?: boolean;
}

/** Faithful re-implementation of attachVibeGuard's tool_call path with kill switches. */
function makeMutantToolCall(toggles: GateToggles): ToolCallHandler {
	let directorReadCount = 0;
	return async (event) => {
		if (event.toolName === "read") {
			directorReadCount++;
			return;
		}
		if (event.toolName !== "vibe_spawn") return;

		const input = (event.input && typeof event.input === "object" ? event.input : {}) as Record<string, unknown>;
		const rawCli = typeof input.cli === "string" ? input.cli : "good";
		const prompt = typeof input.prompt === "string" ? input.prompt : "";
		const name = typeof input.name === "string" ? input.name : "";

		// Mutant: builder-name filter removed from the classifier
		const recon = toggles.checkBuilderName === false ? isReconScoutNoBuilderFilter(rawCli, name, prompt) : isReconScout(rawCli, name, prompt);
		if (recon) return;

		if (toggles.checkReads !== false && directorReadCount === 0) {
			return { block: true, reason: "SLOP_GUARD_BLOCKED: no reads" } satisfies ToolCallBlock;
		}
		if (toggles.checkPaths !== false && !FILE_PATH_RE.test(prompt)) {
			return { block: true, reason: "SLOP_GUARD_BLOCKED: no paths" } satisfies ToolCallBlock;
		}
		if (toggles.checkSections !== false) {
			const sectionCount = prompt.match(STRUCTURAL_HEADER_RE)?.length ?? 0;
			if (sectionCount < 2) {
				return { block: true, reason: "SLOP_GUARD_BLOCKED: no sections" } satisfies ToolCallBlock;
			}
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

const IMPL_BRIEF = "## Target Files\nsrc/vibe/gate.ts\n## Acceptance Criteria\nbuild passes";

describe("mutation — every gate check is load-bearing", () => {
	test("M1: removing the read-count check lets an unverified Director dispatch", async () => {
		const real = realToolCall();
		const blocked = await real({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-x", prompt: IMPL_BRIEF } });
		expect(blocked?.block).toBe(true);

		const mutant = makeMutantToolCall({ checkReads: false });
		const allowed = await mutant({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-x", prompt: IMPL_BRIEF } });
		expect(allowed).toBeUndefined();
	});

	test("M2: removing the file-path check lets a pathless brief dispatch", async () => {
		const real = realToolCall();
		await real({ toolName: "read", input: { path: "src/index.ts" } });
		const blocked = await real({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: "## Target Files\n## Acceptance Criteria\nno concrete paths" },
		});
		expect(blocked?.block).toBe(true);

		const mutant = makeMutantToolCall({ checkPaths: false });
		await mutant({ toolName: "read", input: {} });
		const allowed = await mutant({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: "## Target Files\n## Acceptance Criteria\nno concrete paths" },
		});
		expect(allowed).toBeUndefined();
	});

	test("M3: removing the section-structure check lets a one-section brief dispatch", async () => {
		const real = realToolCall();
		await real({ toolName: "read", input: { path: "src/index.ts" } });
		const blocked = await real({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: "## Target Files\nsrc/vibe/gate.ts only" },
		});
		expect(blocked?.block).toBe(true);

		const mutant = makeMutantToolCall({ checkSections: false });
		await mutant({ toolName: "read", input: {} });
		const allowed = await mutant({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: "## Target Files\nsrc/vibe/gate.ts only" },
		});
		expect(allowed).toBeUndefined();
	});

	test("M4: removing the builder-name filter misclassifies a builder as a scout", async () => {
		expect(isReconScout("fast", "core-builder", "explore the repo")).toBe(false);
		expect(isReconScoutNoBuilderFilter("fast", "core-builder", "explore the repo")).toBe(true);

		const real = realToolCall();
		const blocked = await real({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "core-builder", prompt: "explore the repo then rewrite it" },
		});
		expect(blocked?.block).toBe(true);

		const mutant = makeMutantToolCall({ checkBuilderName: false });
		const allowed = await mutant({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "core-builder", prompt: "explore the repo then rewrite it" },
		});
		expect(allowed).toBeUndefined();
	});
});
