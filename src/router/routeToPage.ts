import { html } from "@arrow-js/core";
import type { ArrowExpression } from "@arrow-js/core";
import { ExamplesIndex } from "../examples/ExamplesIndex";
import { examples, findExample } from "../examples/registry";

/**
 * Single route resolver, shared by every entry point. Returns the page status,
 * title (metadata), and Arrow view together — the same shape the Arrow Vite
 * scaffold uses, so a future SSR/hydration lane can call this identically on
 * both server and client. The client router (./client.ts) wraps the view in the
 * sandbox Frame and sets document.title from this.
 */
export interface Page {
	status: number;
	title: string;
	view: ArrowExpression;
}

const APP_NAME = "Arrow Sandbox";

export function routeToPage(url: string): Page {
	const { pathname } = new URL(url, window.location.origin);

	if (pathname === "/" || pathname === "") {
		return {
			status: 200,
			title: `Examples · ${APP_NAME}`,
			view: ExamplesIndex(examples),
		};
	}

	const match = findExample(pathname);
	if (match) {
		return {
			status: 200,
			title: `${match.label} · ${APP_NAME}`,
			view: match.view(),
		};
	}

	return {
		status: 404,
		title: `Not found · ${APP_NAME}`,
		view: html`
			<div class="oas-settings">
				<div class="setting-item setting-item-heading">
					<div class="setting-item-info">
						<div class="setting-item-name">Not found</div>
						<div class="setting-item-description">
							No route for <code>${pathname}</code>. <a href="/">Back to examples</a>.
						</div>
					</div>
				</div>
			</div>
		`,
	};
}
