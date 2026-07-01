import { reactive } from "@arrow-js/core";
import { defineStories } from "../viewer/stories";
import { Toggle } from "./SettingsPanel";

export default defineStories({
	description: "Obsidian checkbox-container toggle used by SettingsPanel.",
	componentPath: "src/components/SettingsPanel.ts",
	variants: {
		interactive: () => {
			const state = reactive({ on: true });
			return Toggle(
				() => state.on,
				() => {
					state.on = !state.on;
				}
			);
		},
		off: {
			render: () =>
				Toggle(
					() => false,
					() => {}
				),
			notes: "Static off state (click does nothing).",
		},
	},
});
