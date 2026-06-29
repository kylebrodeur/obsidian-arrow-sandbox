import { html } from "@arrow-js/core";
import type { ArrowTemplate } from "@arrow-js/core";
import type { Example } from "./registry";

/**
 * Landing page at "/" — an Obsidian-styled list of the available example
 * components, each linking to its own route. Plain anchors (full reloads) keep
 * the router trivial; the sandbox doesn't need SPA navigation.
 */
export const ExamplesIndex = (items: Example[]): ArrowTemplate => html`
	<div class="oas-settings">
		<div class="setting-item setting-item-heading">
			<div class="setting-item-info">
				<div class="setting-item-name">Examples</div>
				<div class="setting-item-description">
					Component demos rendered with real Obsidian styling.
				</div>
			</div>
		</div>
		${items.map((example) =>
			html`
					<div class="setting-item">
						<div class="setting-item-info">
							<div class="setting-item-name">
								<a href="${example.path}">${example.label}</a>
							</div>
							<div class="setting-item-description">${example.description}</div>
						</div>
						<div class="setting-item-control">
							<a class="mod-cta oas-open-link" href="${example.path}">Open</a>
						</div>
					</div>
				`.key(example.path)
		)}
	</div>
`;
