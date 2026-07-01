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
	{
		label: "Callout",
		entries: [
			{
				className: '.callout[data-callout="info"]',
				whenToUse:
					'Info callout block. Swap data-callout for "warning", "danger", "tip", "success", "note" etc.',
				preview: () => html`
					<div class="callout" data-callout="info">
						<div class="callout-title"><div class="callout-title-inner">Info</div></div>
						<div class="callout-content"><p>Callout body text.</p></div>
					</div>
				`,
			},
			{
				className: '.callout[data-callout="warning"]',
				whenToUse:
					"Warning callout — same structure, different data-callout triggers Obsidian's color + icon.",
				preview: () => html`
					<div class="callout" data-callout="warning">
						<div class="callout-title"><div class="callout-title-inner">Warning</div></div>
						<div class="callout-content"><p>Something to be aware of.</p></div>
					</div>
				`,
			},
		],
	},
	{
		label: "Tags & badges",
		entries: [
			{
				className: ".tag",
				whenToUse: "Inline tag pill — styled like Obsidian's note tags.",
				preview: () => html`<span class="tag">#plugin</span> <span class="tag">#arrow-js</span>`,
			},
			{
				className: ".badge",
				whenToUse: "Numeric counter badge (e.g. unread count on a nav item).",
				preview: () => html`
					<div style="display:flex;align-items:center;gap:8px;">
						<span>Notifications</span><span class="badge">3</span>
					</div>
				`,
			},
		],
	},
	{
		label: "Suggestion list",
		entries: [
			{
				className: ".suggestion-item (.is-selected)",
				whenToUse:
					"Fuzzy-finder / autocomplete row. .suggestion-container wraps the list; .is-selected highlights the focused item.",
				preview: () => html`
					<div class="suggestion-container">
						<div class="suggestion">
							<div class="suggestion-item is-selected">selected-file.md</div>
							<div class="suggestion-item">another-file.md</div>
							<div class="suggestion-item">third-file.md</div>
						</div>
					</div>
				`,
			},
		],
	},
	{
		label: "Status modifiers",
		entries: [
			{
				className: "button.mod-warning",
				whenToUse: "Secondary/warning button variant.",
				preview: () => html`<button class="mod-warning">Warning action</button>`,
			},
			{
				className: "button.mod-destructive",
				whenToUse: "Destructive / danger button.",
				preview: () => html`<button class="mod-destructive">Delete</button>`,
			},
			{
				className: ".mod-muted (text)",
				whenToUse: "Muted text color applied to any element via this modifier.",
				preview: () => html`<span class="mod-muted">Secondary text</span>`,
			},
		],
	},
	{
		label: "File tree",
		entries: [
			{
				className: ".nav-file-title (.is-active)",
				whenToUse: "File row in a nav/file-tree pane. Use .is-active for the currently open file.",
				preview: () => html`
					<div class="nav-files-container">
						<div class="nav-file">
							<div class="nav-file-title is-active">active-note.md</div>
						</div>
						<div class="nav-file">
							<div class="nav-file-title">another-note.md</div>
						</div>
					</div>
				`,
			},
			{
				className: ".nav-folder-title",
				whenToUse: "Folder row — collapsible; pair with .nav-folder-collapse-indicator.",
				preview: () => html`
					<div class="nav-folder">
						<div class="nav-folder-title">
							<div class="nav-folder-collapse-indicator collapse-icon"></div>
							My Folder
						</div>
					</div>
				`,
			},
		],
	},
	{
		label: "Metadata",
		entries: [
			{
				className: ".metadata-container",
				whenToUse: "Frontmatter property table rendered by Obsidian's properties view.",
				preview: () => html`
					<div class="metadata-container">
						<div class="metadata-property">
							<div class="metadata-property-key">
								<div class="metadata-property-key-input">status</div>
							</div>
							<div class="metadata-property-value">
								<div class="metadata-input-markdown">draft</div>
							</div>
						</div>
					</div>
				`,
			},
		],
	},
];
