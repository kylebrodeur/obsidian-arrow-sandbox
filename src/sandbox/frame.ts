import { html } from "@arrow-js/core";
import type { ArrowExpression, ArrowTemplate } from "@arrow-js/core";
import { themeState, toggleTheme } from "./theme";

/**
 * Wraps a component in an Obsidian workspace-leaf shell so the sandbox looks
 * like a real side-panel view. Uses Obsidian's own layout classes
 * (.workspace-leaf, .view-header, .view-content) so the chrome is styled by
 * app.css, not by us. The only sandbox-specific affordance is the theme toggle.
 *
 * Sandbox chrome only — components are mounted *inside* this, and it's the
 * component (not the frame) that gets ported into the plugin.
 */
export const Frame = (content: ArrowExpression): ArrowTemplate => html`
  <div class="workspace-leaf oas-frame">
    <div class="workspace-leaf-content" data-type="arrow-sandbox">
      <div class="view-header">
        <div class="view-header-title-container">
          <div class="view-header-title">Arrow Sandbox</div>
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
  </div>
`;
