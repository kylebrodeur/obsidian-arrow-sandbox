import { reactive } from "@arrow-js/core";

/**
 * Sandbox-only theme state. Obsidian toggles `body.theme-dark` /
 * `body.theme-light`; we mirror that so app.css resolves the right token set.
 * This file is sandbox chrome — it does NOT get ported into the plugin.
 */
export type ObsidianTheme = "theme-dark" | "theme-light";

export const themeState = reactive<{ theme: ObsidianTheme }>({ theme: "theme-dark" });

/** Apply the current theme class to <body>, removing the other. */
export function applyTheme(): void {
	const body = document.body;
	body.classList.remove("theme-dark", "theme-light");
	body.classList.add(themeState.theme);
}

export function toggleTheme(): void {
	themeState.theme = themeState.theme === "theme-dark" ? "theme-light" : "theme-dark";
	applyTheme();
}
