import { html } from "@arrow-js/core";
import type { ArrowExpression, ArrowTemplate } from "@arrow-js/core";
import { Toolbar } from "./toolbar";

/**
 * Sandbox shell: the width-control toolbar plus a stage that holds the pane.
 * The Frame (and the component under test) mount inside the stage. Sandbox
 * chrome — only the pane contents port into a plugin.
 */
export const Shell = (content: ArrowExpression): ArrowTemplate => html`
	<div class="oas-shell">
		${Toolbar()}
		<div class="oas-stage">${content}</div>
	</div>
`;
