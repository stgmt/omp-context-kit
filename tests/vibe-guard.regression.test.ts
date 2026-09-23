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

describe("regression — non-vibe tools pass through unmodified", () => {
	// 10 tests: every non-vibe tool returns undefined (never blocked, never rewritten)
	test.each(["bash", "edit", "write", "grep", "glob", "task", "vibe_kill", "vibe_send", "vibe_wait", "vibe_list"])(
		"tool_call '%s' is never blocked",
		async (toolName) => {
			const { toolCall } = attach();
			const res = await toolCall({ toolName, input: { arbitrary: "input" } });
			expect(res).toBeUndefined();
		},
	);

	// 11th: non-vibe tools must not feed the read counter — a bash call is not a verified read
	test("non-read tools do not count as verified reads", async () => {
		const { toolCall } = attach();
		for (const toolName of ["bash", "edit", "write", "grep", "glob", "task"]) {
			await toolCall({ toolName, input: {} });
		}
		const res = await toolCall({ toolName: "vibe_spawn", input: { cli: "good", name: "impl-x", prompt: "x" } });
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("has not read");
	});
});

describe("regression — non-vibe context messages untouched", () => {
	// 12th: ordinary messages and foreign customType contexts are returned without rewrite
	test("context event leaves normal and non-vibe messages untouched", async () => {
		const { context } = attach();
		const messages = [
			{ role: "user", content: "hello" },
			{ role: "assistant", content: "hi there" },
			{ role: "custom", customType: "plan-mode-context", content: "plan prompt" },
			{ role: "custom", customType: "goal-mode-context", content: "goal prompt" },
		];
		const res = await context({ messages });
		expect(res).toBeUndefined();
		expect(messages[2]?.content).toBe("plan prompt");
		expect(messages[3]?.content).toBe("goal prompt");
	});
});
