import { html } from "@arrow-js/core";
import type { ArrowExpression } from "@arrow-js/core";
import { Home } from "../sandbox/home";
import { ClassesPage } from "../viewer/ClassesPage";
import { StoryPage } from "../viewer/StoryPage";
import { TokensPage } from "../viewer/TokensPage";
import { findStory, stories } from "../viewer/discovery";
import { ViewerSidebar } from "../viewer/sidebar";

/**
 * Single route resolver, shared by every entry point (Arrow scaffold shape, so
 * a future SSR lane could call it identically). Pages may carry a sidebar
 * (rendered outside the pane) and routes may resolve to a redirect, which the
 * client router applies via history.replaceState.
 */
export interface Page {
	status: number;
	title: string;
	view: ArrowExpression;
	sidebar?: ArrowExpression;
}

export interface Redirect {
	redirect: string;
}

const APP_NAME = "Arrow Sandbox";

function notFound(pathname: string): Page {
	return {
		status: 404,
		title: `Not found · ${APP_NAME}`,
		view: html`
			<div class="oas-settings">
				<div class="setting-item setting-item-heading">
					<div class="setting-item-info">
						<div class="setting-item-name">Not found</div>
						<div class="setting-item-description">
							No route for <code>${pathname}</code>. <a href="/">Back home</a>.
						</div>
					</div>
				</div>
			</div>
		`,
	};
}

export function routeToPage(url: string): Page | Redirect {
	const { pathname, searchParams } = new URL(url, window.location.origin);

	if (pathname === "/" || pathname === "") {
		return { status: 200, title: APP_NAME, view: Home() };
	}

	if (pathname === "/example") {
		return { redirect: "/components/settings-panel" };
	}

	if (pathname === "/components" || pathname === "/components/") {
		const first = stories[0];
		return first ? { redirect: `/components/${first.slug}` } : notFound(pathname);
	}

	const storyMatch = pathname.match(/^\/components\/([^/]+)$/);
	if (storyMatch) {
		const story = findStory(storyMatch[1]);
		if (!story) {
			return { ...notFound(pathname), sidebar: ViewerSidebar(pathname) };
		}
		const requested = searchParams.get("variant");
		const variantName = requested ?? Object.keys(story.variants)[0];
		return {
			status: story.variants[variantName] ? 200 : 404,
			title: `${story.title} · ${APP_NAME}`,
			view: StoryPage(story, variantName),
			sidebar: ViewerSidebar(`/components/${story.slug}`),
		};
	}

	if (pathname === "/reference") {
		return {
			status: 200,
			title: `Tokens · ${APP_NAME}`,
			view: TokensPage(),
			sidebar: ViewerSidebar(pathname),
		};
	}

	if (pathname === "/reference/classes") {
		return {
			status: 200,
			title: `Classes · ${APP_NAME}`,
			view: ClassesPage(),
			sidebar: ViewerSidebar(pathname),
		};
	}

	return notFound(pathname);
}
