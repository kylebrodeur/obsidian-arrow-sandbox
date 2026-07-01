import type { ArrowExpression } from "@arrow-js/core";

/**
 * Single-object story format (see the 2026-06-30 spec's decision record: CSF 3
 * and Ladle were the references; we diverged because no Storybook renderer
 * exists for Arrow, and one validated object is harder to get wrong).
 */

export interface StoryVariant {
	render: () => ArrowExpression;
	notes?: string;
}

export type VariantInput = StoryVariant | (() => ArrowExpression);

export interface StoryDef {
	/** Display name; defaults to the start-cased filename. */
	title?: string;
	/** One-line description shown in the tree and header. */
	description?: string;
	/** Repo-relative override for where the component lives (e.g. a subcomponent
	 * defined inside its parent's file). Defaults to the stories path minus `.stories`. */
	componentPath?: string;
	/** Named variants; keys are human strings ("default", "dev mode off"). */
	variants: Record<string, VariantInput>;
	/** Slugs of subcomponent stories for drill-in nesting. */
	children?: string[];
	/** Whether this component is production-ready or still in development. */
	status?: "live" | "draft";
}

export function defineStories(def: StoryDef): StoryDef {
	return def;
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateStoryDef(def: unknown): ValidationResult {
	if (!isRecord(def)) {
		return { ok: false, reason: "default export is not an object (use defineStories({...}))" };
	}
	for (const field of ["title", "description", "componentPath"] as const) {
		if (field in def && typeof def[field] !== "string") {
			return { ok: false, reason: `"${field}" must be a string` };
		}
	}
	if (!isRecord(def.variants) || Object.keys(def.variants).length === 0) {
		return { ok: false, reason: '"variants" must be a non-empty object' };
	}
	for (const [name, variant] of Object.entries(def.variants)) {
		const valid =
			typeof variant === "function" || (isRecord(variant) && typeof variant.render === "function");
		if (!valid) {
			return { ok: false, reason: `variant "${name}" must be a render fn or { render }` };
		}
	}
	if ("children" in def) {
		const children = def.children;
		if (!Array.isArray(children) || children.some((child) => typeof child !== "string")) {
			return { ok: false, reason: '"children" must be an array of story slugs' };
		}
	}
	if ("status" in def) {
		if (def.status !== "live" && def.status !== "draft") {
			return { ok: false, reason: '"status" must be "live" or "draft"' };
		}
	}
	return { ok: true };
}

export function normalizeVariants(
	variants: Record<string, VariantInput>
): Record<string, StoryVariant> {
	const out: Record<string, StoryVariant> = {};
	for (const [name, variant] of Object.entries(variants)) {
		out[name] = typeof variant === "function" ? { render: variant } : variant;
	}
	return out;
}
