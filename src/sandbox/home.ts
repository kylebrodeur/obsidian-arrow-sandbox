import { component, html, reactive } from "@arrow-js/core";
import type { ArrowTemplate } from "@arrow-js/core";
import { layoutState } from "./layout";
import { themeState } from "./theme";

const probe = reactive({ tick: 0 });

function stylingLoaded(): boolean {
	const generation = probe.tick;
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

const gettingStarted = reactive({ expanded: false });

const GETTING_STARTED = [
	{ cmd: "pnpm pull-css", note: "extract Obsidian's app.css — run once (macOS auto-detect)" },
	{ cmd: "pnpm dev", note: "this dev server (Vite + HMR)" },
	{ cmd: "pnpm skills:install --yes", note: "install the agent skills from the published repo" },
	{ cmd: "pnpm run ci", note: "biome + typecheck + tests + build" },
];

const VIEWS = [
	{ label: "Components", path: "/components", note: "Component story viewer" },
	{ label: "Tokens", path: "/reference", note: "CSS custom property reference" },
	{ label: "Classes", path: "/reference/classes", note: "Obsidian class catalog" },
];

export const Home = component((): ArrowTemplate => {
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
		</div>

		<div class="${() => (gettingStarted.expanded ? "oas-card is-expanded" : "oas-card")}">
			<div
				class="oas-card-header"
				@click="${() => {
					gettingStarted.expanded = !gettingStarted.expanded;
				}}"
			>
				<span class="oas-card-title">Getting started</span>
				<span class="oas-card-chevron">›</span>
			</div>
			<div class="oas-card-body">
				<div class="oas-settings">
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
				<p class="oas-card-note">
					See AGENTS.md + docs/ for the full flow; agent prompts in docs/prompts/.
				</p>
			</div>
		</div>

		<div class="oas-settings">
			<div class="setting-item setting-item-heading">
				<div class="setting-item-info">
					<div class="setting-item-name">Views</div>
					<div class="setting-item-description">Main pages in this sandbox.</div>
				</div>
			</div>
			${VIEWS.map((view) =>
				html`
					<div class="setting-item">
						<div class="setting-item-info">
							<div class="setting-item-name">
								<a href="${view.path}">${view.label}</a>
							</div>
							<div class="setting-item-description">${view.note}</div>
						</div>
						<div class="setting-item-control">
							<a class="mod-cta oas-open-link" href="${view.path}">Open</a>
						</div>
					</div>
				`.key(view.label)
			)}
		</div>
	`;
});
