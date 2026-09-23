import { describe, expect, test } from "bun:test";
import { isReconScout } from "../src/vibe/classifier.js";
import { FILE_PATH_RE } from "../src/vibe/gate.js";

describe("isReconScout — Tier 1: name prefixes", () => {
	test.each(["recon", "scout", "search", "audit", "inspect"])("accepts %s- prefixed worker names", (prefix) => {
		expect(isReconScout("good", `${prefix}-auth-flow`, "implement everything")).toBe(true);
	});

	test("prefix match is case-insensitive", () => {
		expect(isReconScout("good", "ReCon-Api", "x")).toBe(true);
		expect(isReconScout("good", "SCOUT-db", "x")).toBe(true);
		expect(isReconScout("good", "AUDIT-ledger", "x")).toBe(true);
	});

	test("prefix without hyphen still matches (anchored at name start)", () => {
		expect(isReconScout("good", "reconnaissance", "x")).toBe(true);
		expect(isReconScout("good", "scoutmaster", "x")).toBe(true);
	});

	test("recon word NOT at name start does not trigger Tier 1", () => {
		expect(isReconScout("good", "deep-recon-worker", "no recon keywords here")).toBe(false);
	});
});

describe("isReconScout — Tier 2: prompt declarations", () => {
	test.each(["RECON", "SCOUT", "SEARCH", "AUDIT", "DISCOVERY", "INVESTIGATE"])(
		"accepts %s: declaration at prompt start",
		(keyword) => {
			expect(isReconScout("good", "worker-1", `${keyword}: map the auth module`)).toBe(true);
		},
	);

	test("declaration tolerates leading whitespace", () => {
		expect(isReconScout("good", "worker-1", "   \n\t RECON: find files")).toBe(true);
	});

	test("declaration is case-insensitive", () => {
		expect(isReconScout("good", "worker-1", "recon: find files")).toBe(true);
	});

	test("keyword mid-prompt is NOT a declaration", () => {
		expect(isReconScout("good", "worker-1", "Please RECON the module before editing")).toBe(false);
	});
});

describe("isReconScout — Tier 3: fast tier + recon keywords", () => {
	test.each(["recon", "scout", "search", "audit", "find", "explore", "locate", "investigate", "inspect", "census"])(
		"fast worker with keyword '%s' in name is a scout",
		(keyword) => {
			expect(isReconScout("fast", `w-${keyword}-x`, "do the thing")).toBe(true);
		},
	);

	test("fast worker with recon keyword in prompt preamble is a scout", () => {
		expect(isReconScout("fast", "worker-1", "Please explore the repository layout")).toBe(true);
	});

	test("recon keyword beyond the 300-char preamble window does not count", () => {
		const padding = "x".repeat(310);
		expect(isReconScout("fast", "worker-1", `${padding} explore`)).toBe(false);
	});

	test("non-fast cli with only Tier-3 evidence is not a scout", () => {
		expect(isReconScout("good", "worker-1", "explore the repository layout")).toBe(false);
	});
});

describe("isReconScout — builder exclusions", () => {
	test.each(["build", "builder", "impl", "implement", "fix", "fixer", "patch", "patcher", "core", "refactor", "coder"])(
		"fast worker named with builder token '%s' is NOT a scout",
		(token) => {
			expect(isReconScout("fast", `${token}-worker`, "explore the repo")).toBe(false);
		},
	);

	test("builder tokens in the PROMPT do not disqualify a scout", () => {
		expect(isReconScout("fast", "worker-1", "explore the repo; note the builder pattern used in src/x.ts")).toBe(true);
	});

	test("Tier 1 name prefix wins over builder tokens elsewhere in the name", () => {
		expect(isReconScout("fast", "scout-core-builder", "anything")).toBe(true);
	});
});

describe("isReconScout — forensic traps", () => {
	test("negative constraints do not flip a scout into a worker", () => {
		expect(isReconScout("fast", "scout-x", "Search the repo. Do NOT build, do NOT edit, no fixes, do not patch.")).toBe(
			true,
		);
	});

	test("feature/branch names with action words do not disqualify Tier-1 scouts", () => {
		expect(isReconScout("fast", "recon-x", "inspect worktree at ref feat/prompt-refusal-rewrite")).toBe(true);
	});

	test("word-boundary: 'finder' and 'undefined' do not count as 'find'", () => {
		expect(isReconScout("fast", "finder-bot", "check the module")).toBe(false);
		expect(isReconScout("fast", "worker-1", "the value is undefined in some paths")).toBe(false);
	});

	test("empty inputs are not scouts", () => {
		expect(isReconScout("", "", "")).toBe(false);
		expect(isReconScout("fast", "", "")).toBe(false);
	});
});

describe("FILE_PATH_RE — hardened path matching", () => {
	test.each(["5.00pm", "v1.0", "section 2.4", "no. 5", "3.14", "2.4"])(
		"rejects dotted non-path token '%s'",
		(token) => {
			expect(FILE_PATH_RE.test(token)).toBe(false);
		},
	);

	test.each([
		"src/vibe/gate.ts",
		"E:\\repos\\omp-context-kit\\src\\vibe\\gate.ts",
		"./src/index.ts",
		"gate.ts",
		"README.md",
		"package.json",
		"dir/sub/file.test.ts",
		"scripts/install-all-profiles.mjs",
	])("accepts real path '%s'", (p) => {
		expect(FILE_PATH_RE.test(p)).toBe(true);
	});

	test("rejects unknown bare extensions without a separator", () => {
		expect(FILE_PATH_RE.test("notes.txt")).toBe(false);
		expect(FILE_PATH_RE.test("archive.zip")).toBe(false);
		expect(FILE_PATH_RE.test("dir/archive.zip")).toBe(true);
	});
});
