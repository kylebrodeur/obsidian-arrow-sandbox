import { defineStories } from "../viewer/stories";
import { SettingsPanel } from "./SettingsPanel";

export default defineStories({
	description: "Vertical tabs, toggles, a keyed list, and an async boundary() section.",
	variants: {
		default: () => SettingsPanel(),
	},
	children: ["toggle"],
});
