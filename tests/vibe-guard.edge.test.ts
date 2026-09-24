import { describe, expect, test } from "bun:test";
import ompVibeKit from "../src/index.js";
import type { ContextHandler, ExtensionAPI, ToolCallHandler } from "../src/types.js";

function attach(): { context: ContextHandler; toolCall: ToolCallHandler } {
	const handlers: { context?: ContextHandler; toolCall?: ToolCallHandler } = {};
	const pi: ExtensionAPI = {
		on(event: string, handler: never) {
			if (event === "context") handlers.context = handler as ContextHandler;
			if (event === "tool_call") handlers.toolCall = handler as ToolCallHandler;
		},
	};
	ompVibeKit(pi);
	if (!handlers.context || !handlers.toolCall) throw new Error("hooks not registered");
	return { context: handlers.context, toolCall: handlers.toolCall };
}

async function readOnce(toolCall: ToolCallHandler) {
	await toolCall({ toolName: "read", input: { path: "src/index.ts" } });
}

async function initTodo(toolCall: ToolCallHandler) {
	await toolCall({ toolName: "todo", input: { op: "init", list: ["recon done", "implement", "verify"] } });
}


const WORKER_CONTRACT_SECTIONS = [
	["Goal", "Implement the requested focused behavior."],
	["Done when", "The expected behavior is observable and verified."],
	["Scope / Non-goals", "In scope: src/index.ts. Non-goals: unrelated files."],
	["Evidence", "Return the behavior checked and its result."],
	["Checkpoint", "15m after spawn."],
	["Dependencies", "None"],
] as const;

type WorkerContractHeading = (typeof WORKER_CONTRACT_SECTIONS)[number][0];

function workerBrief(omit?: WorkerContractHeading, overrides: Partial<Record<WorkerContractHeading, string>> = {}): string {
	return WORKER_CONTRACT_SECTIONS.filter(([heading]) => heading !== omit)
		.map(([heading, body]) => "## " + heading + "\n" + (overrides[heading] ?? body))
		.join("\n\n");
}

function workerBriefWithScope(scope: string, goal = "Implement the requested focused behavior."): string {
	return workerBrief(undefined, { Goal: goal, "Scope / Non-goals": scope });
}

describe("BDD: worker spawn contract", () => {
	test("Given all six sections, when an implementation worker starts, then the gate allows it", async () => {
		const { toolCall } = attach();
		await readOnce(toolCall);
		await initTodo(toolCall);
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-contract", prompt: workerBrief() },
		});
		expect(res).toBeUndefined();
	});

	test.each(WORKER_CONTRACT_SECTIONS.map(([heading]) => heading))(
		"Given the '%s' section is missing, when a worker starts, then the gate names the missing section",
		async (heading) => {
			const { toolCall } = attach();
			await readOnce(toolCall);
			await initTodo(toolCall);
			const res = await toolCall({
				toolName: "vibe_spawn",
				input: { cli: "good", name: "impl-contract", prompt: workerBrief(heading) },
			});
			expect(res?.block).toBe(true);
			expect(res?.reason).toContain(heading);
		},
	);

	test.each(WORKER_CONTRACT_SECTIONS.map(([heading]) => [heading, ""] as const))(
		"Given the '%s' section is empty, when a worker starts, then the gate rejects it",
		async (heading, value) => {
			const { toolCall } = attach();
			await readOnce(toolCall);
			await initTodo(toolCall);
			const res = await toolCall({
				toolName: "vibe_spawn",
				input: { cli: "good", name: "impl-contract", prompt: workerBrief(undefined, { [heading]: value }) },
			});
			expect(res?.block).toBe(true);
			expect(res?.reason).toContain(heading);
		},
	);

	test.each([
		["Goal", "TBD"],
		["Done when", "TODO: fill in"],
		["Scope / Non-goals", "[placeholder]"],
		["Evidence", "TBD"],
		["Evidence", "Evidence remains TBD until the check runs."],
		["Checkpoint", "later"],
		["Checkpoint", "0m after spawn"],
		["Checkpoint", "-0.5h after spawn"],
		["Dependencies", "TODO: fill in"],
	] as const)(
		"Given '%s' contains a placeholder or invalid checkpoint, when a worker starts, then the gate rejects it",
		async (heading, value) => {
			const { toolCall } = attach();
			await readOnce(toolCall);
			await initTodo(toolCall);
			const res = await toolCall({
				toolName: "vibe_spawn",
				input: { cli: "good", name: "impl-contract", prompt: workerBrief(undefined, { [heading]: value }) },
			});
			expect(res?.block).toBe(true);
			expect(res?.reason).toContain(heading);
		},
	);

	test.each([
		["compound hours and minutes", "1h30m after spawn"],
		["one day", "1 day after spawn"],
		["two days", "2 days after spawn"],
		["abbreviated hours", "3 hrs after spawn"],
		["fractional hours", "0.5h after spawn"],
		["half an hour", "half an hour after spawn"],
	] as const)("positive elapsed checkpoint (%s) is accepted", async (_label, checkpoint) => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "recon-valid-duration", prompt: workerBrief(undefined, { Checkpoint: checkpoint }) },
		});
		expect(res).toBeUndefined();
	});
	test("Given a recon scout without the contract, when it starts, then the gate still blocks it", async () => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "recon-contract", prompt: workerBrief("Evidence") },
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("Evidence");
	});

	test("valid TypeScript generics and markup are not placeholders", async () => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "fast",
				name: "recon-type-syntax",
				prompt: workerBrief(undefined, { Evidence: "Return Promise<Session> from validate() and preserve <div> markup." }),
			},
		});
		expect(res).toBeUndefined();
	});

	test("brief rejection names the placeholder marker", async () => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "recon-placeholder-token", prompt: workerBrief(undefined, { Evidence: "TBD" }) },
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("Evidence");
		expect(res?.reason).toContain("TBD");
	});

	test("mixed None and real prerequisites are rejected", async () => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "recon-dependencies", prompt: workerBrief(undefined, { Dependencies: "None\nworker-a must finish first" }) },
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("Dependencies");
	});
	test("same-line mixed None and real prerequisites are rejected", async () => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "recon-dependencies-same-line", prompt: workerBrief(undefined, { Dependencies: "None; worker-a must finish first" }) },
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("Dependencies");
		expect(res?.reason).toContain("sole content");
	});

	test("Master-TODO and todoist references are not placeholders", async () => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "recon-todo-vocabulary", prompt: workerBrief(undefined, { Evidence: "Update the Master-TODO.\nKeep [todoist] integration." }) },
		});
		expect(res).toBeUndefined();
	});

	test("None remains a placeholder outside Dependencies", async () => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "recon-goal", prompt: workerBrief(undefined, { Goal: "None" }) },
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("Goal");
	});

	test("duplicate contract headings are rejected by name", async () => {
		const { toolCall } = attach();
		const prompt = workerBrief() + "\n\n## Goal\nA second outcome.";
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "recon-duplicate-goal", prompt },
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("Duplicate ## Goal");
	});

	test("headings inside fenced examples do not count as sections", async () => {
		const { toolCall } = attach();
		const fence = String.fromCharCode(96).repeat(3);
		const prompt = workerBrief().replace(
			"## Goal\n",
			"## Goal\nDescribe the intended outcome.\n\n" + fence + "md\n## Goal\nQuoted example heading.\n" + fence + "\n",
		);
		const res = await toolCall({ toolName: "vibe_spawn", input: { cli: "fast", name: "recon-fenced-heading", prompt } });
		expect(res).toBeUndefined();
	});

	test("two-space-indented contract headings remain valid", async () => {
		const { toolCall } = attach();
		const prompt = workerBrief().replace(/^## /gm, "  ## ");
		const res = await toolCall({ toolName: "vibe_spawn", input: { cli: "fast", name: "recon-indented-headings", prompt } });
		expect(res).toBeUndefined();
	});

	test("unrecognized headings do not hide placeholder content", async () => {
		const { toolCall } = attach();
		const prompt = workerBrief().replace(
			"## Evidence\nReturn the behavior checked and its result.",
			"## Evidence\nReturn the behavior checked and its result.\n## Additional context\nTODO: fill in",
		);
		const res = await toolCall({ toolName: "vibe_spawn", input: { cli: "fast", name: "recon-unrecognized-heading", prompt } });
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("Evidence");
		expect(res?.reason).toContain("TODO");
	});

	test("case and repeated whitespace in headings preserve the contract", async () => {
		const { toolCall } = attach();
		const prompt = workerBrief()
			.replace(/^## Goal$/m, "## goal")
			.replace(/^## Done when$/m, "##  DONE   WHEN")
			.replace(/^## Scope \/ Non-goals$/m, "## Scope /  Non-goals");
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "recon-normalized-headings", prompt },
		});
		expect(res).toBeUndefined();
	});
});

describe("edge cases", () => {
	// 1
	test("empty vibe_spawn input blocks without crashing", async () => {
		const { toolCall } = attach();
		await readOnce(toolCall);
		const res = await toolCall({ toolName: "vibe_spawn", input: {} });
		expect(res?.block).toBe(true);
		expect(res?.reason).toStartWith("SLOP_GUARD_BLOCKED");
	});

	// 2
	test("missing input object blocks without crashing", async () => {
		const { toolCall } = attach();
		await readOnce(toolCall);
		const res = await toolCall({ toolName: "vibe_spawn" });
		expect(res?.block).toBe(true);
	});

	// 3
	test("non-string fields are coerced safely (cli defaults to good, empty name/prompt)", async () => {
		const { toolCall } = attach();
		await readOnce(toolCall);
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: 42, name: null, prompt: ["not", "a", "string"] },
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("Missing ## Goal");
	});

	// 4
	test("Windows backslash paths satisfy the file-path gate", async () => {
		const { toolCall } = attach();
		await toolCall({ toolName: "read", input: { path: "E:\\repos\\omp-context-kit\\src\\vibe\\gate.ts" } });
		await initTodo(toolCall);
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "good",
				name: "impl-x",
				prompt: workerBriefWithScope("E:\\repos\\omp-context-kit\\src\\vibe\\gate.ts"),
			},
		});
		expect(res).toBeUndefined();
	});

	// 5
	test("negative constraints keep a fast scout unblocked", async () => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "fast",
				name: "scout-x",
				prompt: workerBriefWithScope("Read-only repo search. Do NOT build, do NOT edit, no fixes, do not patch anything."),
			},
		});
		expect(res).toBeUndefined();
	});

	// 6
	test("branch names with action words keep a Tier-1 scout unblocked", async () => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "fast",
				name: "recon-x",
				prompt: workerBriefWithScope("Read-only discovery of E:/tmp/wt-refusal-v4 at ref feat/prompt-refusal-rewrite; no edits."),
			},
		});
		expect(res).toBeUndefined();
	});

	// 7
	test("pathless brief is blocked with the file-path reason", async () => {
		const { toolCall } = attach();
		await readOnce(toolCall);
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: workerBriefWithScope("No repository file target; focus only on task behavior.") },
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("file paths");
	});

	// 8
	test("legacy brief reports all six missing contract sections", async () => {
		const { toolCall } = attach();
		await readOnce(toolCall);
		await initTodo(toolCall);
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: "## Target Files\nsrc/index.ts — change it" },
		});
		expect(res?.block).toBe(true);
		for (const [heading] of WORKER_CONTRACT_SECTIONS) expect(res?.reason).toContain("Missing ## " + heading);
	});

	// 9
	test("recon keyword beyond the 300-char preamble window does not classify as scout", async () => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "worker-1", prompt: workerBriefWithScope("In scope: src/index.ts.", "x".repeat(310) + " explore the repo") },
		});
		expect(res?.block).toBe(true);
	});

	// 10
	test("todo(op=init) is tracked without blocking; other todo ops pass through", async () => {
		const { toolCall } = attach();
		expect(await toolCall({ toolName: "todo", input: { op: "init", list: ["a"] } })).toBeUndefined();
		expect(await toolCall({ toolName: "todo", input: { op: "complete", id: "a" } })).toBeUndefined();
	});
});

describe("edge cases — hardened path regex", () => {
	// 11: dotted non-path tokens must never satisfy the file-path gate
	test.each(["5.00pm", "v1.0", "section 2.4", "no. 5", "3.14"])(
		"brief whose only dotted token is '%s' is blocked with the file-path reason",
		async (token) => {
			const { toolCall } = attach();
			await readOnce(toolCall);
			await initTodo(toolCall);
			const res = await toolCall({
				toolName: "vibe_spawn",
				input: {
					cli: "good",
					name: "impl-x",
					prompt: workerBriefWithScope(token),
				},
			});
			expect(res?.block).toBe(true);
			expect(res?.reason).toContain("file paths");
		},
	);

	// 12: bare filenames with recognized extensions still satisfy the gate
	test.each(["gate.ts", "README.md", "package.json", "build.sh", "schema.graphql"])(
		"brief citing bare filename '%s' passes the file-path gate",
		async (file) => {
			const { toolCall } = attach();
			await toolCall({ toolName: "read", input: { path: `src/${file}` } });
			await initTodo(toolCall);
			const res = await toolCall({
				toolName: "vibe_spawn",
				input: {
					cli: "good",
					name: "impl-x",
					prompt: workerBriefWithScope(file),
				},
			});
			expect(res).toBeUndefined();
		},
	);
});

describe("edge cases — targeted read intersection", () => {
	// 13
	test("citing src/billing.ts after reading only src/auth.ts is blocked with the targeted-read reason", async () => {
		const { toolCall } = attach();
		await toolCall({ toolName: "read", input: { path: "src/auth.ts" } });
		await initTodo(toolCall);
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "good",
				name: "impl-billing",
				prompt: workerBriefWithScope("In scope: src/billing.ts."),
			},
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("None of the target files cited in the brief were inspected");
	});

	// 14: basename match counts — director read the same file via a different path form
	test("cited path matches a read via basename", async () => {
		const { toolCall } = attach();
		await toolCall({ toolName: "read", input: { path: "src/vibe/gate.ts" } });
		await initTodo(toolCall);
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "good",
				name: "impl-x",
				prompt: workerBriefWithScope("In scope: E:/repos/omp-context-kit/src/vibe/gate.ts."),
			},
		});
		expect(res).toBeUndefined();
	});

	// 15: at least ONE cited path intersecting is enough when several are cited
	test("brief citing one read file plus unread files is permitted", async () => {
		const { toolCall } = attach();
		await toolCall({ toolName: "read", input: { path: "src/vibe/gate.ts" } });
		await initTodo(toolCall);
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "good",
				name: "impl-x",
				prompt: workerBriefWithScope("In scope:\nsrc/vibe/gate.ts\nsrc/vibe/classifier.ts\nNon-goals: unrelated changes."),
			},
		});
		expect(res).toBeUndefined();
	});

	// 16: read with a line selector still registers the file path
	test("read path with :N-M selector registers the file for intersection", async () => {
		const { toolCall } = attach();
		await toolCall({ toolName: "read", input: { path: "src/vibe/gate.ts:40-132" } });
		await initTodo(toolCall);
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "good",
				name: "impl-x",
				prompt: workerBriefWithScope("In scope: src/vibe/gate.ts."),
			},
		});
		expect(res).toBeUndefined();
	});

	// 17: ./-prefixed read path normalizes to the same target
	test("read of ./src/x.ts intersects a cite of src/x.ts", async () => {
		const { toolCall } = attach();
		await toolCall({ toolName: "read", input: { path: "./src/vibe/gate.ts" } });
		await initTodo(toolCall);
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "good",
				name: "impl-x",
				prompt: workerBriefWithScope("In scope: src/vibe/gate.ts."),
			},
		});
		expect(res).toBeUndefined();
	});
});

describe("edge cases — master-TODO gate", () => {
	// 18
	test("spawning without todo(op=init) is blocked with the todo reason", async () => {
		const { toolCall } = attach();
		await toolCall({ toolName: "read", input: { path: "src/vibe/gate.ts" } });
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "good",
				name: "impl-x",
				prompt: workerBriefWithScope("In scope: src/vibe/gate.ts."),
			},
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("Master-TODO checklist has not been initialized");
	});

	// 19: non-init todo ops do NOT satisfy the gate
	test.each(["complete", "add", "list", "update"])("todo(op=%s) does not satisfy the master-TODO gate", async (op) => {
		const { toolCall } = attach();
		await toolCall({ toolName: "read", input: { path: "src/vibe/gate.ts" } });
		await toolCall({ toolName: "todo", input: { op, id: "a" } });
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "good",
				name: "impl-x",
				prompt: workerBriefWithScope("In scope: src/vibe/gate.ts."),
			},
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("Master-TODO");
	});

	// 20: todo(op=start) also satisfies the gate
	test("todo(op=start) satisfies the master-TODO gate", async () => {
		const { toolCall } = attach();
		await toolCall({ toolName: "read", input: { path: "src/vibe/gate.ts" } });
		await toolCall({ toolName: "todo", input: { op: "start", list: ["a"] } });
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: {
				cli: "good",
				name: "impl-x",
				prompt: workerBriefWithScope("In scope: src/vibe/gate.ts."),
			},
		});
		expect(res).toBeUndefined();
	});
});
