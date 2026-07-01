import { html } from "@arrow-js/core";
import type { ArrowExpression } from "@arrow-js/core";
import { stories } from "./discovery";

export function ComponentsIndex(): ArrowExpression {
	if (stories.length === 0) {
		return html`
			<div class="oas-settings">
				<div class="setting-item setting-item-heading">
					<div class="setting-item-info">
						<div class="setting-item-name">Components</div>
						<div class="setting-item-description">
							No stories found. Create a <code>*.stories.ts</code> file next to a component.
						</div>
					</div>
				</div>
			</div>
		`;
	}
	return html`
		<div class="oas-settings">
			<div class="setting-item setting-item-heading">
				<div class="setting-item-info">
					<div class="setting-item-name">Components</div>
					<div class="setting-item-description">
						${stories.length} ${stories.length === 1 ? "story" : "stories"} — click to open.
					</div>
				</div>
			</div>
			${stories.map((story) => {
				const path = `/components/${story.slug}`;
				const badge =
					story.status === "live"
						? html`<span class="oas-badge is-live">live</span>`
						: html`<span class="oas-badge is-draft">draft</span>`;
				return html`
					<div class="setting-item">
						<div class="setting-item-info">
							<div class="setting-item-name">
								<a href="${path}">${story.title}</a> ${badge}
							</div>
							${
								story.description
									? html`<div class="setting-item-description">${story.description}</div>`
									: ""
							}
						</div>
						<div class="setting-item-control">
							<a class="mod-cta oas-open-link" href="${path}">Open →</a>
						</div>
					</div>
				`.key(story.slug);
			})}
		</div>
	`;
}
