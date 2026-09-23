/**
 * Reconnaissance scout classification.
 *
 * Prefix-first priority: scout identity is decided by explicit naming and
 * prompt declarations, never by scanning full prompt text for action verbs.
 * Negative constraints ("do not build") and feature/branch names
 * ("prompt-refusal-rewrite") must not flip a scout into a worker.
 */
export const RECON_KEYWORD_RE = /\b(recon|scout|search|audit|find|explore|locate|investigate|inspect|census)\b/i;

const RECON_NAME_PREFIX_RE = /^(recon|scout|search|audit|inspect)/;
const RECON_PROMPT_DECLARATION_RE = /^\s*(RECON|SCOUT|SEARCH|AUDIT|DISCOVERY|INVESTIGATE)\b/i;
const BUILDER_NAME_RE = /\b(build|builder|impl|implement|fix|fixer|patch|patcher|core|refactor|coder)\b/i;

export function isReconScout(cli: string, name: string, prompt: string): boolean {
	const rawCli = cli.toLowerCase().trim();
	const nameClean = name.toLowerCase().trim();
	const promptClean = prompt.trim();

	// Tier 1: Explicit name prefix recon- or scout- or search- or audit- or inspect-
	if (RECON_NAME_PREFIX_RE.test(nameClean)) {
		return true;
	}

	// Tier 2: Explicit recon declaration at start of prompt
	if (RECON_PROMPT_DECLARATION_RE.test(promptClean)) {
		return true;
	}

	// Tier 3: Fast tier with recon keywords in name or prompt preamble, and not an explicit builder name
	if (rawCli === "fast") {
		const hasReconKw = RECON_KEYWORD_RE.test(nameClean) || RECON_KEYWORD_RE.test(promptClean.slice(0, 300));
		const isBuilderName = BUILDER_NAME_RE.test(nameClean);
		if (hasReconKw && !isBuilderName) {
			return true;
		}
	}

	return false;
}
