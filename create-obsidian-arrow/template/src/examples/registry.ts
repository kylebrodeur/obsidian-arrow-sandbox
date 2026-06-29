import type { ArrowExpression } from "@arrow-js/core";
import { SettingsPanel } from "../components/SettingsPanel";

/**
 * Registry of example components, keyed by route path. Add a new demo here and
 * it shows up on the index page and at its own path automatically.
 */
export interface Example {
	path: string;
	label: string;
	description: string;
	view: () => ArrowExpression;
}

export const examples: Example[] = [
	{
		path: "/example",
		label: "Settings panel",
		description: "Vertical tabs, toggles, a keyed list, and an async boundary() section.",
		view: () => SettingsPanel(),
	},
];

export function findExample(path: string): Example | undefined {
	return examples.find((example) => example.path === path);
}
