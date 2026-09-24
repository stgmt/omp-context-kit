import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Live E2E: loads dist/extension.js through the real OMP extension loader and
 * drives it through a real ExtensionRunner — the same dispatch path the agent
 * loop uses. Requires the installed pi-coding-agent runtime (OMP_RUNTIME_ROOT
 * or ~/.omp/plugins/node_modules/@oh-my-pi/pi-coding-agent).
 */

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, ""));
const runtimeRoot = resolve(
	process.env.OMP_RUNTIME_ROOT ?? join(homedir(), ".omp/plugins/node_modules/@oh-my-pi/pi-coding-agent"),
);
const runtimeModule = (relativePath: string) => import(pathToFileURL(join(runtimeRoot, relativePath)).href);

const sdk = await runtimeModule("src/sdk.ts");
const { ExtensionRunner } = await runtimeModule("src/extensibility/extensions/runner.ts");
const { EventBus } = await runtimeModule("src/utils/event-bus.ts");
const { SessionManager } = await runtimeModule("src/session/session-manager.ts");

const projectRoot = await mkdtemp(join(tmpdir(), "omp-vibe-kit-e2e-"));
afterAll(async () => {
	await rm(projectRoot, { recursive: true, force: true });
});

const extensionPath = join(repoRoot, "dist", "extension.js");
const settings = sdk.Settings.isolated();
const eventBus = new EventBus();
const loaded = await sdk.loadSessionExtensions(
	{ disableExtensionDiscovery: true, additionalExtensionPaths: [extensionPath] },
	projectRoot,
	settings,
	eventBus,
);

const sessionManager = SessionManager.inMemory(projectRoot);
const modelRegistry = { getAvailable: () => [] };
const runner = new ExtensionRunner(loaded.extensions, loaded.runtime, projectRoot, sessionManager, modelRegistry);

const vibeMessage = () => ({
	role: "custom",
	customType: "vibe-mode-context",
	content: "default vibe prompt",
	display: false,
	attribution: "agent",
	timestamp: Date.now(),
});

const spawn = (input: Record<string, unknown>) =>
	runner.emitToolCall({ type: "tool_call", toolName: "vibe_spawn", toolCallId: `e2e-${crypto.randomUUID()}`, input });
const workerBrief = (scope: string, goal = "Complete the scoped task."): string =>
	[
		["Goal", goal],
		["Done when", "The requested behavior is observable and verified."],
		["Scope / Non-goals", scope],
		["Evidence", "Return the behavior checked and its result."],
		["Checkpoint", "15m after spawn."],
		["Dependencies", "None"],
	].map(([heading, body]) => "## " + heading + "\n" + body).join("\n\n");

describe("e2e — live ExtensionRunner chain", () => {
	test("loader binds dist/extension.js without errors", () => {
		expect(loaded.errors).toEqual([]);
		expect(loaded.extensions.length).toBe(1);
	});

	test("emitContext rewrites vibe-mode-context through the real pipeline", async () => {
		const result = await runner.emitContext([vibeMessage()]);
		expect(result[0]?.content).toContain("Zero-Slop Execution Pipeline");
		for (const heading of [
			"## Goal",
			"## Done when",
			"## Scope / Non-goals",
			"## Evidence",
			"## Checkpoint",
			"## Dependencies",
		]) {
			expect(result[0]?.content).toContain(heading);
			expect(result[0]?.content).not.toContain(heading + ":");
		}
	});

	test("emitContext leaves foreign customType messages untouched", async () => {
		const msg = { ...vibeMessage(), customType: "plan-mode-context", content: "plan prompt" };
		const result = await runner.emitContext([msg]);
		expect(result[0]?.content).toBe("plan prompt");
	});

	test("recon scout spawn is permitted with zero reads", async () => {
		const res = await spawn({
			cli: "fast",
			name: "recon-api",
			prompt: workerBrief("Read-only search for auth files; do not edit.", "Find authentication implementation files."),
		});
		expect(res?.block).toBeUndefined();
	});

	test("incomplete brief blocks before scout bypass in the live runner", async () => {
	const incompleteBrief = workerBrief("In scope: src/index.ts.").replace(/^## Evidence\n.*$/m, "");
	const res = await spawn({
		cli: "fast",
		name: "recon-missing-evidence",
		prompt: incompleteBrief,
	});
	expect(res?.block).toBe(true);
	expect(res?.reason).toStartWith("SLOP_GUARD_BLOCKED");
	expect(res?.reason).toContain("Missing ## Evidence");
});

test("implementation worker is blocked at zero reads with SLOP_GUARD_BLOCKED", async () => {
		const res = await spawn({
			cli: "good",
			name: "impl-x",
			prompt: workerBrief("In scope: src/x.ts; no unrelated files."),
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toStartWith("SLOP_GUARD_BLOCKED");
	});

	test("after a read, a grounded brief without todo init is blocked end-to-end", async () => {
		await runner.emitToolCall({
			type: "tool_call",
			toolName: "read",
			toolCallId: `e2e-${crypto.randomUUID()}`,
			input: { path: "src/vibe/classifier.ts" },
		});
		const res = await spawn({
			cli: "good",
			name: "impl-y",
			prompt: workerBrief("In scope: src/vibe/classifier.ts; no unrelated files."),
		});
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("Master-TODO");
	});

	test("after read + todo init, a grounded brief is permitted end-to-end", async () => {
		await runner.emitToolCall({
			type: "tool_call",
			toolName: "read",
			toolCallId: `e2e-${crypto.randomUUID()}`,
			input: { path: "src/vibe/gate.ts" },
		});
		await runner.emitToolCall({
			type: "tool_call",
			toolName: "todo",
			toolCallId: `e2e-${crypto.randomUUID()}`,
			input: { op: "init", list: ["recon done", "implement", "verify"] },
		});
		const res = await spawn({
			cli: "good",
			name: "impl-x",
			prompt: workerBrief("In scope: src/vibe/gate.ts; do not edit unrelated files."),
		});
		expect(res?.block).toBeUndefined();
	});

	test("non-vibe tools pass through the live runner unmodified", async () => {
		for (const toolName of ["bash", "edit", "write", "grep", "glob"]) {
			const res = await runner.emitToolCall({
				type: "tool_call",
				toolName,
				toolCallId: `e2e-${crypto.randomUUID()}`,
				input: {},
			});
			expect(res?.block).toBeUndefined();
		}
	});
});
