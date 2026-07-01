import { html } from "@arrow-js/core";
import type { ArrowTemplate } from "@arrow-js/core";
import type { ArrowExpression } from "@arrow-js/core";
import type { TreeNode } from "./derive";
import { findStory, invalidStories, storyTree } from "./discovery";

/**
 * Viewer navigation: component tree (children indented under parents) plus the
 * Reference section. Rendered OUTSIDE the pane, as the first child of the
 * stage. Sandbox chrome — never ports to a plugin.
 */

function navClass(active: boolean): string {
	return active
		? "vertical-tab-nav-item oas-nav-item is-active"
		: "vertical-tab-nav-item oas-nav-item";
}

function nodeRows(node: TreeNode, activePath: string, depth: number): ArrowTemplate | string {
	const story = findStory(node.slug);
	if (!story) {
		return "";
	}
	const href = `/components/${node.slug}`;
	return html`
		<a
			class="${navClass(activePath === href)}"
			style="${`padding-left: calc(var(--size-4-3) * ${depth + 1});`}"
			href="${href}"
		>${story.title}</a>
		${node.children.map((child) => nodeRows(child, activePath, depth + 1))}
	`;
}

export function ViewerSidebar(activePath: string): ArrowExpression {
	return html`
		<nav class="oas-sidebar">
			<div class="vertical-tab-header-group">
				<div class="vertical-tab-header-group-title">Components</div>
				${storyTree.roots.map((node) => nodeRows(node, activePath, 0))}
				${invalidStories.map(
					(bad) =>
						html`<div class="vertical-tab-nav-item oas-nav-invalid" title="${bad.reason}">
							invalid: ${bad.storiesPath}
						</div>`
				)}
			</div>
			<div class="vertical-tab-header-group">
				<div class="vertical-tab-header-group-title">Reference</div>
				<a class="${navClass(activePath === "/reference")}" href="/reference">Tokens</a>
				<a class="${navClass(activePath === "/reference/classes")}" href="/reference/classes">Classes</a>
			</div>
		</nav>
	`;
}
