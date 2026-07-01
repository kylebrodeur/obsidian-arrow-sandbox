import { html } from "@arrow-js/core";
import type { ArrowExpression } from "@arrow-js/core";
import type { DiscoveredStory } from "./discovery";
import { findStory } from "./discovery";

/** Copy to clipboard, best-effort (clipboard API needs a secure context). */
export function copyText(text: string): void {
	void navigator.clipboard?.writeText(text);
}

function pathRow(label: string, path: string): ArrowExpression {
	return html`
		<div class="oas-story-path">
			<span class="oas-path-label">${label}</span>
			<code>${path}</code>
			<button class="oas-copy" @click="${() => copyText(path)}">Copy</button>
		</div>
	`;
}

export function StoryPage(story: DiscoveredStory, variantName: string): ArrowExpression {
	const variant = story.variants[variantName];
	const variantNames = Object.keys(story.variants);
	const badge =
		story.status === "live"
			? html`<span class="oas-badge is-live">live</span>`
			: html`<span class="oas-badge is-draft">draft</span>`;
	return html`
		<div class="oas-story">
			<div class="setting-item setting-item-heading">
				<div class="setting-item-info">
					<div class="setting-item-name">${story.title} ${badge}</div>
					${
						story.description
							? html`<div class="setting-item-description">${story.description}</div>`
							: ""
					}
				</div>
			</div>
			<div class="oas-story-meta">
				${pathRow("component", story.componentPath)}
				${pathRow("stories", story.storiesPath)}
			</div>
			<div class="oas-variants">
				${variantNames.map((name) => {
					const cls = name === variantName ? "oas-variant is-active" : "oas-variant";
					const href = `/components/${story.slug}?variant=${encodeURIComponent(name)}`;
					return html`<a class="${cls}" href="${href}">${name}</a>`;
				})}
			</div>
			${variant?.notes ? html`<div class="oas-story-notes">${variant.notes}</div>` : ""}
			${
				story.children.length > 0
					? html`<div class="oas-story-children">
						${story.children.map((slug) => {
							const child = findStory(slug);
							return child
								? html`<a class="oas-child" href="${`/components/${slug}`}">${child.title} →</a>`
								: html`<span class="oas-child-missing">${slug} (missing story)</span>`;
						})}
					</div>`
					: ""
			}
			<div class="oas-story-canvas">
				${
					variant
						? variant.render()
						: html`<div class="oas-story-missing">No variant "${variantName}" — pick one above.</div>`
				}
			</div>
		</div>
	`;
}
