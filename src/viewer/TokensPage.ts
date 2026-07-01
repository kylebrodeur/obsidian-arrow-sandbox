import { component, html, reactive } from "@arrow-js/core";
import { themeState } from "../sandbox/theme";
import { copyText } from "./StoryPage";
import type { TokenDecl } from "./token-utils";
import { classifyValue, filterTokens, groupTokens } from "./token-utils";
import { collectTokenDecls, resolveToken } from "./tokens";

const state = reactive({ query: "" });

function tokenRow(decl: TokenDecl) {
	// Depend on themeState.theme so rows re-resolve when the theme toggles.
	const resolved = (): string => {
		void themeState.theme;
		return resolveToken(decl.name) || decl.value;
	};
	return html`
		<div class="oas-token-row">
			<code class="oas-token-name">${decl.name}</code>
			<span class="oas-token-value">${() => resolved()}</span>
			${() => {
				const kind = classifyValue(resolved());
				if (kind === "color") {
					return html`<span class="oas-swatch" style="${() => `background: ${resolved()};`}"></span>`;
				}
				if (kind === "length") {
					return html`<span class="oas-sizebar" style="${() => `width: ${resolved()};`}"></span>`;
				}
				return html`<span class="oas-swatch-none"></span>`;
			}}
			<button class="oas-copy" @click="${() => copyText(`var(${decl.name})`)}">Copy</button>
		</div>
	`;
}

export const TokensPage = component(() => {
	const decls = collectTokenDecls();
	return html`
		<div class="oas-reference">
			<div class="setting-item setting-item-heading">
				<div class="setting-item-info">
					<div class="setting-item-name">Obsidian tokens (${String(decls.length)})</div>
					<div class="setting-item-description">
						Parsed live from the loaded app.css; values resolve in the current theme. Copy gives
						you the var() reference.
					</div>
				</div>
			</div>
			${
				decls.length === 0
					? html`<div class="setting-item">
						<div class="setting-item-info">
							<div class="setting-item-name">No tokens found</div>
							<div class="setting-item-description">
								app.css doesn't appear to be loaded — run \`pnpm pull-css\`, then reload.
							</div>
						</div>
					</div>`
					: ""
			}
			<input
				class="oas-token-filter"
				type="search"
				placeholder="Filter tokens…"
				.value="${() => state.query}"
				@input="${(e: Event) => {
					state.query = (e.target as HTMLInputElement).value;
				}}"
			/>
			${() =>
				groupTokens(filterTokens(decls, state.query)).map((group) =>
					html`
						<div class="oas-token-group">
							<div class="vertical-tab-header-group-title">
								${group.label} (${String(group.tokens.length)})
							</div>
							${group.tokens.map((decl) => tokenRow(decl))}
						</div>
					`.key(group.label)
				)}
		</div>
	`;
});
