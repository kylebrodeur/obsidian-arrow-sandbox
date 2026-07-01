/**
 * Pure token parsing/grouping for the reference index. The browser side feeds
 * this CSSOM rule text (rule.cssText); keeping the parser string-in/data-out
 * makes it node:test-able without a DOM.
 */

export interface TokenDecl {
	name: string;
	value: string;
}

export function parseCustomProps(cssText: string): TokenDecl[] {
	const out: TokenDecl[] = [];
	const re = /(--[A-Za-z0-9_-]+)\s*:\s*([^;}]+)/g;
	let match = re.exec(cssText);
	while (match !== null) {
		out.push({ name: match[1], value: match[2].trim() });
		match = re.exec(cssText);
	}
	return out;
}

const GROUP_PREFIXES: [string, string][] = [
	["--size-", "Size & spacing"],
	["--radius-", "Radius"],
	["--color-", "Colors"],
	["--background-", "Backgrounds"],
	["--text-", "Text"],
	["--font-", "Fonts & type"],
	["--shadow-", "Shadows"],
	["--interactive-", "Interactive"],
	["--icon-", "Icons"],
];
const OTHER_LABEL = "Other";

export interface TokenGroup {
	label: string;
	tokens: TokenDecl[];
}

export function groupTokens(decls: TokenDecl[]): TokenGroup[] {
	const latest = new Map<string, string>();
	for (const decl of decls) {
		latest.set(decl.name, decl.value);
	}
	const buckets = new Map<string, TokenDecl[]>();
	for (const [name, value] of latest) {
		const label = GROUP_PREFIXES.find(([prefix]) => name.startsWith(prefix))?.[1] ?? OTHER_LABEL;
		const bucket = buckets.get(label) ?? [];
		bucket.push({ name, value });
		buckets.set(label, bucket);
	}
	const order = [...GROUP_PREFIXES.map(([, label]) => label), OTHER_LABEL];
	return order
		.filter((label) => buckets.has(label))
		.map((label) => ({
			label,
			tokens: (buckets.get(label) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
		}));
}

export type ValueKind = "color" | "length" | "other";

export function classifyValue(resolved: string): ValueKind {
	const value = resolved.trim();
	if (
		/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ||
		/^(rgb|rgba|hsl|hsla)\(/i.test(value)
	) {
		return "color";
	}
	if (value === "0" || /^-?\d+(\.\d+)?(px|em|rem|%|ch|vw|vh|vmin|vmax|pt)$/.test(value)) {
		return "length";
	}
	return "other";
}

export function filterTokens(decls: TokenDecl[], query: string): TokenDecl[] {
	const q = query.trim().toLowerCase();
	if (q === "") {
		return decls;
	}
	return decls.filter((decl) => decl.name.toLowerCase().includes(q));
}
