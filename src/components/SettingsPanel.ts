import { component, html, reactive } from "@arrow-js/core";
import type { ArrowTemplate } from "@arrow-js/core";
import { boundary } from "@arrow-js/framework";
import { loadStatus } from "../data/loadStatus";

/**
 * Baseline Arrow component for the Obsidian sandbox.
 *
 * Built only with Obsidian's own classes (.setting-item, .checkbox-container,
 * .vertical-tab-*) + var(--…) tokens, so it copy-pastes into an ItemView /
 * settings tab. It deliberately exercises the template features that matter:
 *
 *   - reactive `${() => …}` vs static `${…}`
 *   - attribute sync with false-removal: `disabled="${() => !cond}"` (false ⇒ removed)
 *   - property binding: `.checked="${() => …}"`
 *   - events: `@click`
 *   - keyed lists: `.key(id)` + fine-grained in-place reactivity
 *   - an async section via component(asyncFn, { fallback }) wrapped in boundary()
 */

interface Feature {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
}

const tabs = [
	{ id: "general", label: "General" },
	{ id: "advanced", label: "Advanced engine" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const state = reactive({
	activeTab: "general" as TabId,
	developerMode: true,
	pluginName: "Arrow Component",
	lastAction: "—",
	features: [
		{
			id: "live-queue",
			name: "Live queue",
			description: "Stream queue updates into the side panel.",
			enabled: true,
		},
		{
			id: "semantic",
			name: "Semantic search",
			description: "Embed notes for vault-wide similarity search.",
			enabled: false,
		},
		{
			id: "telemetry",
			name: "Anonymous telemetry",
			description: "Share usage metrics to improve the plugin.",
			enabled: false,
		},
	] as Feature[],
});

const enabledCount = (): number => state.features.filter((f) => f.enabled).length;

function rebuildIndex(): void {
	state.lastAction = `Rebuilt index at tick ${performance.now().toFixed(0)}`;
}

/**
 * Reusable Obsidian-style toggle. `enabled` is a getter so the control tracks
 * live state; clicking flips it in place (deep reactivity re-runs only the
 * tracked expressions below — no list re-render).
 */
const Toggle = (enabled: () => boolean, onToggle: () => void): ArrowTemplate => html`<div
    class="${() => `checkbox-container${enabled() ? " is-enabled" : ""}`}"
    @click="${onToggle}"
  >
    <input type="checkbox" tabindex="0" .checked="${() => enabled()}" />
  </div>`;

const generalTab = (): ArrowTemplate => html`
  <div class="setting-item setting-item-heading">
    <div class="setting-item-info">
      <div class="setting-item-name">${() => state.pluginName}</div>
      <div class="setting-item-description">
        ${() => `${enabledCount()} of ${state.features.length} features enabled`}
      </div>
    </div>
  </div>

  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Developer sandbox mode</div>
      <div class="setting-item-description">Run isolated component rendering routines.</div>
    </div>
    <div class="setting-item-control">
      ${Toggle(
				() => state.developerMode,
				() => {
					state.developerMode = !state.developerMode;
				}
			)}
    </div>
  </div>

  ${() =>
		state.features.map((feature) =>
			html`
        <div class="setting-item">
          <div class="setting-item-info">
            <div class="setting-item-name">${feature.name}</div>
            <div class="setting-item-description">${feature.description}</div>
          </div>
          <div class="setting-item-control">
            ${Toggle(
							() => feature.enabled,
							() => {
								feature.enabled = !feature.enabled;
							}
						)}
          </div>
        </div>
      `.key(feature.id)
		)}

  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Sandbox state</div>
    </div>
    <div class="setting-item-control">
      <span
        style="${() =>
					`color: ${state.developerMode ? "var(--text-accent)" : "var(--text-error)"}; font-weight: var(--font-semibold);`}"
      >${() => (state.developerMode ? "ONLINE" : "OFFLINE")}</span>
    </div>
  </div>

  ${boundary(statusCard())}
`;

const advancedTab = (): ArrowTemplate => html`
  <div class="setting-item setting-item-heading">
    <div class="setting-item-info">
      <div class="setting-item-name">Advanced engine</div>
    </div>
  </div>

  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Rebuild index</div>
      <div class="setting-item-description">
        ${() =>
					state.developerMode
						? "Available while developer mode is on."
						: "Enable developer mode to rebuild."}
      </div>
    </div>
    <div class="setting-item-control">
      <button
        class="mod-cta"
        disabled="${() => !state.developerMode}"
        @click="${rebuildIndex}"
      >Rebuild</button>
    </div>
  </div>

  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Last action</div>
      <div class="setting-item-description" style="font-family: var(--font-monospace);">
        ${() => state.lastAction}
      </div>
    </div>
  </div>
`;

/** Async component: resolves to a setting row; shows a fallback while pending. */
const statusCard = component(
	async () => {
		const status = await loadStatus();
		return html`
      <div class="setting-item">
        <div class="setting-item-info">
          <div class="setting-item-name">Connection</div>
          <div class="setting-item-description">${status.detail}</div>
        </div>
        <div class="setting-item-control">
          <span style="color: var(--text-success); font-weight: var(--font-semibold);">
            ${status.label}
          </span>
        </div>
      </div>
    `;
	},
	{
		fallback: html`
      <div class="setting-item">
        <div class="setting-item-info">
          <div class="setting-item-name">Connection</div>
          <div class="setting-item-description">Checking connection…</div>
        </div>
        <div class="setting-item-control">
          <span style="color: var(--text-muted);">…</span>
        </div>
      </div>
    `,
	}
);

export const SettingsPanel = component(
	() => html`
    <div class="oas-settings">
      <div class="vertical-tab-header">
        <div class="vertical-tab-header-group">
          <div class="vertical-tab-header-group-title">Plugin settings</div>
          ${() =>
						tabs.map((tab) =>
							html`<div
                  class="${() => `vertical-tab-nav-item${state.activeTab === tab.id ? " is-active" : ""}`}"
                  @click="${() => {
										state.activeTab = tab.id;
									}}"
                >${tab.label}</div>`.key(tab.id)
						)}
        </div>
      </div>

      <div class="vertical-tab-content">
        ${() => (state.activeTab === "general" ? generalTab() : advancedTab())}
      </div>
    </div>
  `
);
