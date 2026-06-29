import { reactive } from "@arrow-js/core";

/**
 * Sandbox-only panel sizing. Obsidian side panels are user-resizable, so we let
 * the tester adjust the pane width (height stays pinned to the window). Sandbox
 * chrome — not ported into the plugin.
 */
export const MIN_WIDTH = 240;
export const WIDTH_PRESETS = [280, 360, 480, 640];

export const layoutState = reactive<{ width: number }>({ width: 420 });

function maxWidth(): number {
	return Math.max(MIN_WIDTH, window.innerWidth);
}

export function setWidth(px: number): void {
	layoutState.width = Math.min(maxWidth(), Math.max(MIN_WIDTH, Math.round(px)));
}

/** Start a drag-resize from the panel's edge handle. Typed as `Event` so it
 * binds directly to Arrow's `@mousedown` handler signature. */
export function startResize(event: Event): void {
	event.preventDefault();
	const startX = (event as MouseEvent).clientX;
	const startWidth = layoutState.width;

	const onMove = (move: MouseEvent): void => {
		setWidth(startWidth + (move.clientX - startX));
	};
	const onUp = (): void => {
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
		document.body.style.userSelect = "";
	};

	document.body.style.userSelect = "none";
	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
}
