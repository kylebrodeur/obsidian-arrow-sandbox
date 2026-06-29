import { html } from "@arrow-js/core";
import type { ArrowExpression, ArrowTemplate } from "@arrow-js/core";
import { layoutState, startResize } from "./layout";
import { themeState, toggleTheme } from "./theme";

/**
 * Wraps a route view in an Obsidian workspace-leaf shell so the sandbox looks
 * like a real side-panel view. Uses Obsidian's own layout classes
 * (.workspace-leaf, .view-header, .view-content) so the chrome is styled by
 * app.css. Width is driven by reactive layout state (toolbar slider / presets /
 * the edge drag handle); height fills the stage.
 *
 * Sandbox chrome only — the route view mounted inside is what ports to a plugin.
 */
export const Frame = (title: string, content: ArrowExpression): ArrowTemplate => html`
	<div class="workspace-leaf oas-frame" style="${() => `width:${layoutState.width}px`}">
		<div class="workspace-leaf-content" data-type="arrow-sandbox">
			<div class="view-header">
				<div class="oas-view-header-left">
					<a class="clickable-icon oas-home" href="/" aria-label="Examples">⌂</a>
					<div class="view-header-title">${title}</div>
				</div>
				<div class="view-actions">
					<button
						class="clickable-icon oas-theme-toggle"
						aria-label="Toggle theme"
						@click="${toggleTheme}"
					>${() => (themeState.theme === "theme-dark" ? "☾" : "☀")}</button>
				</div>
			</div>
			<div class="view-content oas-view-content">${content}</div>
		</div>
		<div class="oas-resize-handle" aria-hidden="true" @mousedown="${startResize}"></div>
	</div>
`;
