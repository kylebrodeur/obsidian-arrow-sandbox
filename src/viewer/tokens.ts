import type { TokenDecl } from "./token-utils";
import { parseCustomProps } from "./token-utils";

/** Walk every same-origin stylesheet (recursing into @media etc.) and parse
 * custom-property declarations out of each style rule's cssText. */
export function collectTokenDecls(): TokenDecl[] {
	const out: TokenDecl[] = [];
	const walk = (rules: CSSRuleList): void => {
		for (const rule of Array.from(rules)) {
			if (rule instanceof CSSStyleRule) {
				out.push(...parseCustomProps(rule.cssText));
			} else if (rule instanceof CSSGroupingRule) {
				walk(rule.cssRules);
			}
		}
	};
	for (const sheet of Array.from(document.styleSheets)) {
		try {
			walk(sheet.cssRules);
		} catch {
			// cross-origin sheet — skip
		}
	}
	return out;
}

/** Resolved value of a token in the CURRENT theme. */
export function resolveToken(name: string): string {
	return getComputedStyle(document.body).getPropertyValue(name).trim();
}
