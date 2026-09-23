/**
 * Minimal structural types for the OMP extension runtime.
 *
 * The compiled bundle must stay self-contained (zero runtime dependencies),
 * so the extension API surface is declared structurally instead of importing
 * `@oh-my-pi/pi-coding-agent` at runtime.
 */

export interface ContextMessage {
	role: string;
	content: string;
	customType?: string;
	[key: string]: unknown;
}

export interface ContextEvent {
	messages?: ContextMessage[];
	[key: string]: unknown;
}

export interface ToolCallEvent {
	toolName: string;
	input?: unknown;
	[key: string]: unknown;
}

export interface ToolCallBlock {
	block: true;
	reason: string;
}

export interface ContextResult {
	messages: ContextMessage[];
}

export type ContextHandler = (event: ContextEvent) => ContextResult | void | Promise<ContextResult | void>;
export type ToolCallHandler = (event: ToolCallEvent) => ToolCallBlock | void | Promise<ToolCallBlock | void>;

export interface ExtensionAPI {
	on(event: "context", handler: ContextHandler): void;
	on(event: "tool_call", handler: ToolCallHandler): void;
	on(event: string, handler: (event: never) => unknown): void;
}
