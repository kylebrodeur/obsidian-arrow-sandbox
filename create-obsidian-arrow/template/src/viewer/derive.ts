/**
 * Pure derivation helpers for the component viewer. DOM-free so node:test can
 * cover them directly (via --experimental-strip-types).
 *
 * Glob keys come from import.meta.glob in src/viewer/discovery.ts, so they are
 * relative to src/viewer/ (e.g. "../components/SettingsPanel.stories.ts").
 */

export interface StoryPathMeta {
	slug: string;
	storiesPath: string;
	componentPath: string;
}

export function kebabCase(name: string): string {
	return name
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/[\s_]+/g, "-")
		.toLowerCase();
}

export function titleFromSlug(slug: string): string {
	return slug
		.split("-")
		.filter(Boolean)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(" ");
}

/** "../components/Foo.stories.ts" → repo-relative paths + slug. */
export function storyMetaFromGlobKey(globKey: string): StoryPathMeta {
	const storiesPath = `src/${globKey.replace(/^(\.\.\/|\.\/)+/, "")}`;
	const componentPath = storiesPath.replace(/\.stories\.ts$/, ".ts");
	const base = storiesPath.split("/").pop() ?? "";
	const slug = kebabCase(base.replace(/\.stories\.ts$/, ""));
	return { slug, storiesPath, componentPath };
}

export interface TreeNode {
	slug: string;
	children: TreeNode[];
}

/**
 * Build the sidebar tree: stories referenced as another story's child nest
 * under it; unreferenced stories are roots. Cycles are guarded (a slug never
 * nests under itself); if a cycle leaves no natural roots, all items become
 * flat roots so nothing disappears from the sidebar.
 */
export function buildStoryTree(items: { slug: string; children?: string[] }[]): {
	roots: TreeNode[];
	unknownChildren: { parent: string; child: string }[];
} {
	const bySlug = new Map(items.map((item) => [item.slug, item]));
	const referenced = new Set<string>();
	const unknownChildren: { parent: string; child: string }[] = [];

	for (const item of items) {
		for (const child of item.children ?? []) {
			if (bySlug.has(child)) {
				referenced.add(child);
			} else {
				unknownChildren.push({ parent: item.slug, child });
			}
		}
	}

	const build = (slug: string, seen: Set<string>): TreeNode => {
		const next = new Set(seen).add(slug);
		const children = (bySlug.get(slug)?.children ?? [])
			.filter((child) => bySlug.has(child) && !next.has(child))
			.map((child) => build(child, next));
		return { slug, children };
	};

	let rootItems = items.filter((item) => !referenced.has(item.slug));
	if (rootItems.length === 0 && items.length > 0) {
		rootItems = items;
	}
	return { roots: rootItems.map((item) => build(item.slug, new Set())), unknownChildren };
}
