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
		await readOnce(toolCall);
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
