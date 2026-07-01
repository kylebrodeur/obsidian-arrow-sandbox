import { buildStoryTree, storyMetaFromGlobKey, titleFromSlug } from "./derive";
import type { StoryDef, StoryVariant } from "./stories";
import { normalizeVariants, validateStoryDef } from "./stories";

/**
 * Discovers co-located *.stories.ts files at build time. The glob key IS the
 * file path, so src locations shown in the viewer are derived, never
 * hand-maintained. One malformed story file is skipped (with a console.warn
 * and an entry in invalidStories) — it never blanks the viewer.
 */

export interface DiscoveredStory {
	slug: string;
	title: string;
	description?: string;
	storiesPath: string;
	componentPath: string;
	variants: Record<string, StoryVariant>;
	children: string[];
	status: "live" | "draft";
}

export interface InvalidStory {
	storiesPath: string;
	reason: string;
}

const modules = import.meta.glob("../components/**/*.stories.ts", { eager: true }) as Record<
	string,
	{ default?: unknown }
>;

export const stories: DiscoveredStory[] = [];
export const invalidStories: InvalidStory[] = [];

for (const [globKey, mod] of Object.entries(modules)) {
	const meta = storyMetaFromGlobKey(globKey);
	const check = validateStoryDef(mod.default);
	if (!check.ok) {
		console.warn(`[viewer] skipping ${meta.storiesPath}: ${check.reason}`);
		invalidStories.push({ storiesPath: meta.storiesPath, reason: check.reason });
		continue;
	}
	const def = mod.default as StoryDef;
	stories.push({
		slug: meta.slug,
		title: def.title ?? titleFromSlug(meta.slug),
		description: def.description,
		storiesPath: meta.storiesPath,
		componentPath: def.componentPath ?? meta.componentPath,
		variants: normalizeVariants(def.variants),
		children: def.children ?? [],
		status: def.status ?? "draft",
	});
}

stories.sort((a, b) => a.title.localeCompare(b.title));

export const storyTree = buildStoryTree(stories);

export function findStory(slug: string): DiscoveredStory | undefined {
	return stories.find((story) => story.slug === slug);
}
