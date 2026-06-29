import { html } from "@arrow-js/core";
import type { ArrowTemplate } from "@arrow-js/core";
import { MIN_WIDTH, WIDTH_PRESETS, layoutState, setWidth } from "./layout";

/**
 * Sandbox toolbar above the pane: panel-width controls for testing components
 * at the widths a real Obsidian side panel can be dragged to. Sandbox chrome —
 * not part of the component under test.
 */
const onRangeInput = (event: Event): void => {
	setWidth(Number((event.target as HTMLInputElement).value));
};

export const Toolbar = (): ArrowTemplate => html`
	<div class="oas-toolbar">
		<span class="oas-toolbar-label">Panel width</span>
		<input
			class="oas-width-range"
			type="range"
			min="${MIN_WIDTH}"
			max="${() => window.innerWidth}"
			.value="${() => String(layoutState.width)}"
			@input="${onRangeInput}"
		/>
		<span class="oas-width-readout">${() => `${layoutState.width}px`}</span>
		${WIDTH_PRESETS.map((width) =>
			html`<button class="oas-preset" @click="${() => setWidth(width)}">${width}</button>`.key(
				width
			)
		)}
	</div>
`;
