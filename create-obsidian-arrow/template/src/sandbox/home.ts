import { component, html, reactive } from "@arrow-js/core";
import type { ArrowTemplate } from "@arrow-js/core";
import { stories } from "../viewer/discovery";
import { layoutState } from "./layout";
import { themeState } from "./theme";

/**
 * Sandbox landing page at "/": a readiness check + getting-started commands +
 * the components list. Sandbox chrome — does not port to a plugin.
 *
 * The readiness probe catches the #1 fresh-machine gotcha: running `pnpm dev`
 * before `pnpm pull-css` leaves app.css unloaded, so every `var(--…)` token is
 * empty. We detect that by reading the computed value of a known token.
 */
const probe = reactive({ tick: 0 });

function stylingLoaded(): boolean {
	const generation = probe.tick; // reactive dependency; Re-check bumps it
	const style = getComputedStyle(document.body);
	return (
		generation >= 0 &&
		style.getPropertyValue("--background-primary").trim() !== "" &&
		style.getPropertyValue("--text-accent").trim() !== ""
	);
}

function recheck(): void {
	probe.tick++;
}

const GETTING_STARTED = [
	{ cmd: "pnpm pull-css", note: "extract Obsidian's app.css — run once (macOS auto-detect)" },
	{ cmd: "pnpm dev", note: "this dev server (Vite + HMR)" },
	{ cmd: "pnpm skills:install --yes", note: "install the agent skills from the published repo" },
	{ cmd: "pnpm run ci", note: "biome + typecheck + tests + build" },
];

export const Home = component((): ArrowTemplate => {
	// Re-probe shortly after mount, in case app.css finished loading after the
	// first paint (stylesheets load async).
	setTimeout(recheck, 250);

	return html`
		<div class="oas-settings">
			<div class="setting-item setting-item-heading">
				<div class="setting-item-info">
					<div class="setting-item-name">Obsidian Arrow Sandbox</div>
					<div class="setting-item-description">
						Prototype Obsidian plugin UI with Arrow.js against Obsidian's real styling.
					</div>
				</div>
			</div>

			<div class="setting-item">
				<div class="setting-item-info">
					<div class="setting-item-name">Obsidian styling</div>
					<div class="setting-item-description">
						${() =>
							stylingLoaded()
								? "app.css loaded — tokens resolve."
								: "Not loaded — run `pnpm pull-css`, then Re-check."}
					</div>
				</div>
				<div class="setting-item-control">
					<span
						style="${() =>
							`color: ${stylingLoaded() ? "var(--text-success)" : "var(--text-error)"}; font-weight: var(--font-semibold);`}"
					>${() => (stylingLoaded() ? "READY" : "MISSING")}</span>
					<button class="oas-recheck" @click="${recheck}">Re-check</button>
				</div>
			</div>

			<div class="setting-item">
				<div class="setting-item-info">
					<div class="setting-item-name">Theme / panel</div>
					<div class="setting-item-description">
						${() => `${themeState.theme} · ${layoutState.width}px`}
					</div>
				</div>
			</div>

			<div class="setting-item setting-item-heading">
				<div class="setting-item-info">
					<div class="setting-item-name">Getting started</div>
					<div class="setting-item-description">
						See AGENTS.md + docs/ for the full flow; agent prompts in docs/prompts/.
					</div>
				</div>
			</div>
			${GETTING_STARTED.map((step) =>
				html`
						<div class="setting-item">
							<div class="setting-item-info">
								<div class="setting-item-name" style="font-family: var(--font-monospace);">
									${step.cmd}
								</div>
								<div class="setting-item-description">${step.note}</div>
							</div>
						</div>
					`.key(step.cmd)
			)}
		</div>
		<div class="setting-item setting-item-heading">
			<div class="setting-item-info">
				<div class="setting-item-name">Components</div>
				<div class="setting-item-description">
					Stories rendered with real Obsidian styling — <a href="/reference">token & class reference</a>.
				</div>
			</div>
		</div>
		${stories.map(
			(story) => html`
			<div class="setting-item">
				<div class="setting-item-info">
					<div class="setting-item-name">
						<a href="${`/components/${story.slug}`}">${story.title}</a>
					</div>
					${
						story.description
							? html`<div class="setting-item-description">${story.description}</div>`
							: ""
					}
				</div>
				<div class="setting-item-control">
					<a class="mod-cta oas-open-link" href="${`/components/${story.slug}`}">Open</a>
				</div>
			</div>
		`
		)}
	`;
});
