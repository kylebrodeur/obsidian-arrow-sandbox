import { Frame } from "../sandbox/frame";
import { routeToPage } from "./routeToPage";

/**
 * Client router. Prefers the native Navigation API (single `navigate` event
 * stream, reliable history traversal) and falls back to the History API +
 * click interception for browsers without it. Both paths resolve through the
 * one `routeToPage()` and re-mount the Frame into the root.
 *
 * Minimal Navigation API typings — TS lib coverage varies by version, so we
 * structurally type only the members we touch instead of relying on lib.dom.
 */
interface NavigateEventLike {
	canIntercept: boolean;
	hashChange: boolean;
	downloadRequest: string | null;
	destination: { url: string };
	intercept(options: { handler: () => Promise<void> | void }): void;
}

interface NavigationLike {
	addEventListener(type: "navigate", listener: (event: NavigateEventLike) => void): void;
}

function getNavigation(): NavigationLike | undefined {
	return (window as unknown as { navigation?: NavigationLike }).navigation;
}

export function startRouter(root: HTMLElement): void {
	const render = (url: string): void => {
		const page = routeToPage(url);
		document.title = page.title;
		root.replaceChildren();
		Frame(page.title, page.view)(root);
	};

	render(window.location.href);

	const navigation = getNavigation();
	if (navigation) {
		navigation.addEventListener("navigate", (event) => {
			if (!event.canIntercept || event.hashChange || event.downloadRequest !== null) {
				return;
			}
			const destination = new URL(event.destination.url);
			if (destination.origin !== window.location.origin) {
				return;
			}
			event.intercept({
				handler: () => {
					render(destination.href);
				},
			});
		});
		return;
	}

	// History API fallback for browsers without the Navigation API.
	document.addEventListener("click", (event) => {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) {
			return;
		}
		const target = event.target as Element | null;
		const link = target?.closest("a");
		if (!link) {
			return;
		}
		const href = link.getAttribute("href");
		if (!href || link.target === "_blank" || link.hasAttribute("download")) {
			return;
		}
		const destination = new URL(href, window.location.origin);
		if (destination.origin !== window.location.origin) {
			return;
		}
		event.preventDefault();
		window.history.pushState({}, "", destination.href);
		render(destination.href);
	});

	window.addEventListener("popstate", () => {
		render(window.location.href);
	});
}
