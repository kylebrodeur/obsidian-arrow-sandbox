import { html, reactive } from "@arrow-js/core";
import type { ArrowExpression } from "@arrow-js/core";

/**
 * Curated catalog of the Obsidian pattern classes worth leveraging, each with
 * a live preview rendered against the real app.css. Curated on purpose:
 * extracting selectors from app.css yields thousands of internal one-offs.
 * When the utility-class layer lands (spec 2), its classes get documented here.
 */

export interface ClassEntry {
	className: string;
	whenToUse: string;
	preview: () => ArrowExpression;
}

export interface ClassGroup {
	label: string;
	entries: ClassEntry[];
}

const toggleState = reactive({ on: true });

export const classGroups: ClassGroup[] = [
	{
		label: "Settings",
		entries: [
			{
				className: ".setting-item",
				whenToUse: "Any labeled row with a control (with .setting-item-info / -control).",
				preview: () => html`
					<div class="setting-item">
						<div class="setting-item-info">
							<div class="setting-item-name">Setting name</div>
							<div class="setting-item-description">One-line description.</div>
						</div>
						<div class="setting-item-control"><button class="mod-cta">Action</button></div>
					</div>
				`,
			},
			{
				className: ".setting-item-heading",
				whenToUse: "Section header row inside a settings-style list.",
				preview: () => html`
					<div class="setting-item setting-item-heading">
						<div class="setting-item-info">
							<div class="setting-item-name">Section heading</div>
						</div>
					</div>
				`,
			},
		],
	},
	{
		label: "Controls",
		entries: [
			{
				className: "button.mod-cta",
				whenToUse: "Primary call-to-action button.",
				preview: () => html`<button class="mod-cta">Primary action</button>`,
			},
			{
				className: ".clickable-icon",
				whenToUse: "Icon button — escapes Obsidian's global button background rule.",
				preview: () => html`<button class="clickable-icon" aria-label="Example">☾</button>`,
			},
			{
				className: ".checkbox-container (.is-enabled)",
				whenToUse: "Obsidian's toggle; flip is-enabled to switch state.",
				preview: () => html`
					<div
						class="${() => (toggleState.on ? "checkbox-container is-enabled" : "checkbox-container")}"
						@click="${() => {
							toggleState.on = !toggleState.on;
						}}"
					>
						<input type="checkbox" tabindex="0" .checked="${() => toggleState.on}" />
					</div>
				`,
			},
		],
	},
	{
		label: "Navigation",
		entries: [
			{
				className: ".vertical-tab-nav-item (.is-active)",
				whenToUse: "Settings-style vertical tab rows (as used by this sidebar).",
				preview: () => html`
					<div class="vertical-tab-nav-item is-active">Active tab</div>
					<div class="vertical-tab-nav-item">Inactive tab</div>
				`,
			},
		],
	},
	{
		label: "Modal & prompt",
		entries: [
			{
				className: ".modal",
				whenToUse:
					"Dialog card (.modal-title + .modal-content). Preview is contained by a transformed wrapper.",
				preview: () => html`
					<div class="modal oas-modal-preview">
						<div class="modal-title">Modal title</div>
						<div class="modal-content">Modal content goes here.</div>
					</div>
				`,
			},
			{
				className: ".prompt-input",
				whenToUse: "Fuzzy-finder style text input inside prompts.",
				preview: () =>
					html`<input class="prompt-input" type="text" placeholder="Type to filter…" />`,
			},
		],
	},
	{
		label: "Workspace chrome",
		entries: [
			{
				className: ".view-header / .view-header-title",
				whenToUse: "Pane header bar, as used by this sandbox's Frame.",
				preview: () => html`
					<div class="view-header">
						<div class="view-header-title">View title</div>
					</div>
				`,
			},
		],
	},
];
