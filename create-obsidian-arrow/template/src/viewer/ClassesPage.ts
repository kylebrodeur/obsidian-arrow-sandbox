import { component, html } from "@arrow-js/core";
import { copyText } from "./StoryPage";
import { classGroups } from "./obsidian-classes";

export const ClassesPage = component(() => {
	return html`
		<div class="oas-reference">
			<div class="setting-item setting-item-heading">
				<div class="setting-item-info">
					<div class="setting-item-name">Obsidian classes</div>
					<div class="setting-item-description">
						Curated pattern classes worth leveraging, rendered live against app.css.
					</div>
				</div>
			</div>
			${classGroups.map(
				(group) => html`
				<div class="oas-class-group">
					<div class="vertical-tab-header-group-title">${group.label}</div>
					${group.entries.map(
						(entry) => html`
						<div class="oas-class-entry">
							<div class="oas-class-head">
								<code>${entry.className}</code>
								<button class="oas-copy" @click="${() => copyText(entry.className)}">Copy</button>
							</div>
							<div class="oas-class-when">${entry.whenToUse}</div>
							<div class="oas-class-preview">${entry.preview()}</div>
						</div>
					`
					)}
				</div>
			`
			)}
		</div>
	`;
});
