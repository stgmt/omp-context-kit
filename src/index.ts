import type { ExtensionAPI } from "./types.js";
import { attachVibeGuard } from "./vibe/index.js";

export default function ompVibeKit(pi: ExtensionAPI): void {
	attachVibeGuard(pi);
}
