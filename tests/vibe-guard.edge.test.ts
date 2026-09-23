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
		expect(res?.reason).toContain("file paths");
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
				prompt: "## Target Files\nE:\\repos\\omp-context-kit\\src\\vibe\\gate.ts\n## Acceptance Criteria\nbuild passes",
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
				prompt: "Search the repo. Do NOT build, do NOT edit, no fixes, do not patch anything.",
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
				prompt: "inspect worktree E:/tmp/wt-refusal-v4 at ref feat/prompt-refusal-rewrite and .specs/",
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
			input: { cli: "good", name: "impl-x", prompt: "## Target Files\n## Acceptance Criteria\nmake it work" },
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("file paths");
	});

	// 8
	test("single-section brief is blocked with the structure reason", async () => {
		const { toolCall } = attach();
		await readOnce(toolCall);
		await initTodo(toolCall);
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "good", name: "impl-x", prompt: "## Target Files\nsrc/index.ts — change it" },
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("structured specification");
	});

	// 9
	test("recon keyword beyond the 300-char preamble window does not classify as scout", async () => {
		const { toolCall } = attach();
		const res = await toolCall({
			toolName: "vibe_spawn",
			input: { cli: "fast", name: "worker-1", prompt: `${"x".repeat(310)} explore the repo` },
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
					prompt: `## Target Files\n${token}\n## Acceptance Criteria\nmake it work`,
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
					prompt: `## Target Files\n${file}\n## Acceptance Criteria\nmake it work`,
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
				prompt: "## Target Files\nsrc/billing.ts\n## Acceptance Criteria\nbun test passes",
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
				prompt: "## Target Files\nE:/repos/omp-context-kit/src/vibe/gate.ts\n## Acceptance Criteria\nok",
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
				prompt: "## Target Files\nsrc/vibe/gate.ts\nsrc/vibe/classifier.ts\n## Acceptance Criteria\nok",
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
				prompt: "## Target Files\nsrc/vibe/gate.ts\n## Acceptance Criteria\nok",
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
				prompt: "## Target Files\nsrc/vibe/gate.ts\n## Acceptance Criteria\nok",
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
				prompt: "## Target Files\nsrc/vibe/gate.ts\n## Acceptance Criteria\nok",
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
				prompt: "## Target Files\nsrc/vibe/gate.ts\n## Acceptance Criteria\nok",
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
				prompt: "## Target Files\nsrc/vibe/gate.ts\n## Acceptance Criteria\nok",
			},
		});
		expect(res).toBeUndefined();
	});
});
